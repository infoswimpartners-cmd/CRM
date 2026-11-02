import { createAdminClient } from '@/lib/supabase/admin'
import { autoDetectLocationForLead } from '@/lib/location-matcher'
import { sendGoogleChatMessage } from '@/lib/google-chat'

export interface ApproveAndDispatchResult {
    success: boolean
    alreadyAssigned?: boolean
    assignedCoachName?: string
    leadName?: string
    sentIndividualCount: number
    sentGeneralCount: number
    location: string
    error?: string
}

/**
 * 事務局による案件承認およびコーチ陣（個別＋全体スペース）への一斉案内実行
 */
export async function approveAndDispatchLead(
    leadId: string,
    options?: { customLocation?: string; siteUrl?: string }
): Promise<ApproveAndDispatchResult> {
    try {
        const supabase = createAdminClient()
        const siteUrl = options?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://crm.swim-partners.com'

        // 1. リード情報の取得
        const { data: lead, error: leadError } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            console.error('[approveAndDispatchLead] Lead fetch error:', leadError)
            return {
                success: false,
                sentIndividualCount: 0,
                sentGeneralCount: 0,
                location: '',
                error: '対象の案件（リード）が見つかりません。',
            }
        }

        // 既にアサイン済みの場合は配信を防止
        if (lead.assigned_coach_id) {
            let coachName = '他のコーチ'
            const { data: coachProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', lead.assigned_coach_id)
                .maybeSingle()
            if (coachProfile?.full_name) {
                coachName = coachProfile.full_name
            }

            return {
                success: false,
                alreadyAssigned: true,
                assignedCoachName: coachName,
                leadName: lead.name,
                sentIndividualCount: 0,
                sentGeneralCount: 0,
                location: lead.lesson_location || '',
                error: `この案件は既に ${coachName} コーチにアサインされています。`,
            }
        }

        // 2. レッスン予定場所の選定（カスタム指定 > 既存設定 > マスタ施設から自動選定）
        let finalLocation = options?.customLocation?.trim() || lead.lesson_location?.trim() || ''
        if (!finalLocation) {
            finalLocation = await autoDetectLocationForLead(supabase, lead.area)
        }

        // 3. リードステータスを「募集開始」に更新し、場所を保存
        await supabase
            .from('leads')
            .update({
                lesson_location: finalLocation,
                status: '募集開始',
            })
            .eq('id', leadId)

        // 4. 通知配信の実行
        // ※ 案件通知の二重送信を防止するため、1つ目の個別優先案内は送信せず、
        //    2つ目の「新規レッスン案件のお知らせ」のみを「コーチとの連絡スペース」に送信します。
        let sentIndividualCount = 0
        let sentGeneralCount = 0

        try {
            // アクティブなコーチ一覧を取得
            const { data: coaches } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'coach')
                .eq('status', 'active')

            const coachNames = (coaches || [])
                .map((c: any) => c.full_name?.replace(/[\s　]+/g, ''))
                .filter(Boolean)

            // activeなWebhookを取得
            const { data: webhooks } = await supabase
                .from('google_chat_webhooks')
                .select('id, webhook_url, space_name')
                .eq('active', true)

            // コーチ連絡スペースの判定関数（エリアスペースやテスト用スペースを除外）
            const isCoachSpace = (name: string) => {
                if (!name) return false
                // システム・テスト・エリア用スペースは明確に除外
                if (
                    name.includes('テスト') ||
                    name.startsWith('SP_') ||
                    name.includes('SP-Tracker') ||
                    name.includes('公式ライン') ||
                    name.includes('エリア')
                ) {
                    return false
                }
                // スペース名に「コーチ」が含まれているか、または登録コーチ名（フルネーム・姓）が含まれていること
                if (name.includes('コーチ')) return true
                return coachNames.some((cn: string) =>
                    name.includes(cn) || (cn.length >= 2 && name.includes(cn.substring(0, 2)))
                )
            }

            // コーチとの連絡スペースのみを抽出し、同一URLへの重複送信を防止
            const seenUrls = new Set<string>()
            const targetWebhooks = (webhooks || []).filter(wh => {
                if (!wh.webhook_url?.startsWith('http')) return false
                if (!isCoachSpace(wh.space_name)) return false
                if (seenUrls.has(wh.webhook_url)) return false
                seenUrls.add(wh.webhook_url)
                return true
            })

            if (targetWebhooks.length > 0) {
                // 通知テンプレート取得
                const { data: configData } = await supabase
                    .from('app_configs')
                    .select('value')
                    .eq('key', 'lead_notification_template')
                    .maybeSingle()

                const defaultTemplate = `📢 *【新規レッスン案件のお知らせ】*
コーチの皆様、新規のレッスン案件が登録されました。
担当をご希望の方は、案件紹介ページよりアサインを行ってください。

*■ 案件詳細*
名前： {{name}}　様
性別： {{gender}}
年齢： {{age}}
レベル・目標： {{skill_level}}
希望エリア/最寄駅： {{area}}
予定プール（候補）： {{location}}
希望頻度： {{frequency}}
可能な曜日・時間帯： {{available_times}}
その他： {{notes}}

希望日時：
① {{datetime1}}
② {{datetime2}}
③ {{datetime3}}
{{second_student_info}}

※予定プールは生徒様の希望エリアから算出した推奨候補です。当日の実施場所はアサイン後に生徒様とご相談・変更可能です。

▼ 案件確認・アサインはこちら
{{assign_url}}`

                const template = configData?.value || defaultTemplate
                const assignUrl = `${siteUrl}/coach/leads`

                // 年齢計算
                let ageStr = '未設定'
                if (lead.birth_date) {
                    const birth = new Date(lead.birth_date)
                    if (!isNaN(birth.getTime())) {
                        const today = new Date()
                        let age = today.getFullYear() - birth.getFullYear()
                        const m = today.getMonth() - birth.getMonth()
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
                        ageStr = `${age}歳`
                    }
                }

                let secondStudentInfo = ''
                if (lead.second_student_name) {
                    let secondAgeStr = '未設定'
                    if (lead.second_student_birth_date) {
                        const sbirth = new Date(lead.second_student_birth_date)
                        if (!isNaN(sbirth.getTime())) {
                            const today = new Date()
                            let sage = today.getFullYear() - sbirth.getFullYear()
                            const sm = today.getMonth() - sbirth.getMonth()
                            if (sm < 0 || (sm === 0 && today.getDate() < sbirth.getDate())) sage--
                            secondAgeStr = `${sage}歳`
                        }
                    }
                    secondStudentInfo = `\n\n【2人目の情報】\n名前： ${lead.second_student_name}\n性別： ${lead.second_student_gender || '未設定'}\n年齢： ${secondAgeStr}`
                }

                const message = template
                    .replace(/\{\{coach_name\}\}/g, 'コーチ')
                    .replace(/\{\{area\}\}/g, lead.area || '未設定')
                    .replace(/\{\{location\}\}/g, finalLocation || lead.area || '近隣公営プール（相談可能）')
                    .replace(/\{\{datetime1\}\}/g, lead.datetime1 || '未指定')
                    .replace(/\{\{datetime2\}\}/g, lead.datetime2 || '未指定')
                    .replace(/\{\{datetime3\}\}/g, lead.datetime3 || '未指定')
                    .replace(/\{\{skill_level\}\}/g, lead.skill_level || lead.concern || '未設定')
                    .replace(/\{\{frequency\}\}/g, lead.frequency || '未設定')
                    .replace(/\{\{notes\}\}/g, lead.notes || 'なし')
                    .replace(/\{\{assign_url\}\}/g, assignUrl)
                    .replace(/\{\{name\}\}/g, lead.name || '未設定')
                    .replace(/\{\{gender\}\}/g, lead.gender || '未設定')
                    .replace(/\{\{age\}\}/g, ageStr)
                    .replace(/\{\{second_student_info\}\}/g, secondStudentInfo)
                    .replace(/\{\{available_times\}\}/g, lead.available_times || '未設定')

                // 全体スペースまたは案件共有スペースへ送信
                for (const wh of targetWebhooks) {
                    try {
                        const ok = await sendGoogleChatMessage(wh.webhook_url, message)
                        if (ok) sentGeneralCount++
                    } catch (err) {
                        console.error(`[approveAndDispatchLead] Failed to send to space ${wh.space_name}:`, err)
                    }
                }
            }
        } catch (genErr) {
            console.error('[approveAndDispatchLead] Error in sending to general webhooks:', genErr)
        }

        return {
            success: true,
            leadName: lead.name,
            sentIndividualCount,
            sentGeneralCount,
            location: finalLocation,
        }
    } catch (error: any) {
        console.error('[approveAndDispatchLead] Unexpected error:', error)
        return {
            success: false,
            sentIndividualCount: 0,
            sentGeneralCount: 0,
            location: '',
            error: error.message || '承認・案内配信中にエラーが発生しました。',
        }
    }
}
