import { createAdminClient } from '@/lib/supabase/admin'
import { getCoachGoogleChatWebhookUrl } from '@/lib/coach-notifications'
import { sendGoogleChatMessage } from '@/lib/google-chat'

export interface MatchCandidate {
    coachId: string
    coachName: string
    webhookUrl: string
    score: number
    matchedReasons: string[]
    matchedStations: string[]
    matchedFacilities: string[]
    matchedDays: string[]
}

export interface CoachMatchingResult {
    leadId: string
    selectedCoaches: MatchCandidate[]
    allActiveCoachesCount: number
    mode: 'matched' | 'broadcast_all'
    reason: string
}

// 曜日表記の正規化
const DAY_MAP: Record<string, string> = {
    '0': '日', '7': '日', 'sun': '日', 'sunday': '日', '日曜日': '日', '日': '日',
    '1': '月', 'mon': '月', 'monday': '月', '月曜日': '月', '月': '月',
    '2': '火', 'tue': '火', 'tuesday': '火', '火曜日': '火', '火': '火',
    '3': '水', 'wed': '水', 'wednesday': '水', '水曜日': '水', '水': '水',
    '4': '木', 'thu': '木', 'thursday': '木', '木曜日': '木', '木': '木',
    '5': '金', 'fri': '金', 'friday': '金', '金曜日': '金', '金': '金',
    '6': '土', 'sat': '土', 'saturday': '土', '土曜日': '土', '土': '土',
}

/**
 * 日時文字列から曜日（日〜土）を抽出
 */
function extractDaysFromDateStr(dateStr: string | null | undefined): string[] {
    if (!dateStr) return []
    const days: string[] = []

    // 1. (月), （火）などのカッコ内曜日
    const parenMatch = dateStr.match(/[（\(]([日月火水木金土])[）\)]/)
    if (parenMatch && parenMatch[1]) {
        days.push(parenMatch[1])
    }

    // 2. 日付からDateオブジェクトを生成して曜日を算出
    const fullDateMatch = dateStr.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/)
    if (fullDateMatch) {
        const y = parseInt(fullDateMatch[1], 10)
        const m = parseInt(fullDateMatch[2], 10) - 1
        const d = parseInt(fullDateMatch[3], 10)
        const dateObj = new Date(y, m, d)
        if (!isNaN(dateObj.getTime())) {
            const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
            if (!days.includes(dayName)) days.push(dayName)
        }
    } else {
        // 年省略: 10/25, 10月25日
        const shortMatch = dateStr.match(/(\d{1,2})[月\/\-](\d{1,2})/)
        if (shortMatch) {
            const now = new Date()
            const m = parseInt(shortMatch[1], 10) - 1
            const d = parseInt(shortMatch[2], 10)
            const dateObj = new Date(now.getFullYear(), m, d)
            if (!isNaN(dateObj.getTime())) {
                const dayName = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
                if (!days.includes(dayName)) days.push(dayName)
            }
        }
    }

    // 3. テキスト内の「月曜」「火曜」等のキーワード
    for (const [key, val] of Object.entries(DAY_MAP)) {
        if (dateStr.includes(key) && !days.includes(val)) {
            days.push(val)
        }
    }

    return days
}

/**
 * 文字列の類似・部分一致判定用ヘルパー（駅名の「駅」除去や空白正規化）
 */
function cleanLocationKeyword(str: string): string {
    return str
        .replace(/駅$/g, '')
        .replace(/エリア$/g, '')
        .replace(/周辺$/g, '')
        .replace(/[\s　]+/g, '')
        .toLowerCase()
}

/**
 * 案件データに対応可能なコーチを選定する（パターンA ＋ 2名以下全員送信）
 */
export async function selectMatchingCoachesForLead(
    lead: any,
    supabaseAdminParam?: any
): Promise<CoachMatchingResult> {
    const supabaseAdmin = supabaseAdminParam || createAdminClient()

    // 1. アクティブな全コーチを取得
    const { data: coaches, error: coachError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, base_area, role')
        .in('role', ['coach', 'admin'])

    if (coachError || !coaches || coaches.length === 0) {
        return {
            leadId: lead.id,
            selectedCoaches: [],
            allActiveCoachesCount: 0,
            mode: 'broadcast_all',
            reason: 'アクティブなコーチが見つかりませんでした',
        }
    }

    // 2. 全コーチの稼働枠（coach_availabilities）を一括取得
    const { data: allAvailabilities } = await supabaseAdmin
        .from('coach_availabilities')
        .select('coach_id, day_of_week, time_of_day, area')

    // 3. 全コーチの過去レッスン実績（lessons）を一括取得
    const { data: allLessons } = await supabaseAdmin
        .from('lessons')
        .select('coach_id, location')
        .not('location', 'is', null)

    // 4. 全コーチの位置設定（app_configs）を一括取得
    const { data: locationConfigs } = await supabaseAdmin
        .from('app_configs')
        .select('key, value')
        .like('key', 'coach_locations:%')

    const locationConfigMap = new Map<string, { stations: string[]; facilityIds: string[]; customLocations: string[] }>()
    if (locationConfigs) {
        locationConfigs.forEach((c: { key: string; value: string }) => {
            const coachId = c.key.replace('coach_locations:', '')
            try {
                const parsed = JSON.parse(c.value)
                locationConfigMap.set(coachId, {
                    stations: Array.isArray(parsed.stations) ? parsed.stations : [],
                    facilityIds: Array.isArray(parsed.facilityIds) ? parsed.facilityIds : [],
                    customLocations: Array.isArray(parsed.customLocations) ? parsed.customLocations : [],
                })
            } catch (e) {}
        })
    }

    // 5. 施設マスター（facilities）を取得
    const { data: facilities } = await supabaseAdmin
        .from('facilities')
        .select('id, name')
    const facilityMap = new Map<string, string>()
    ;(facilities || []).forEach((f: { id: string; name: string }) => facilityMap.set(f.id, f.name.trim()))

    // 案件側の検索対象キーワードを統合
    const leadAreaRaw = (lead.area || '').trim()
    const leadLocationRaw = (lead.lesson_location || '').trim()
    const leadNotesRaw = (lead.notes || '').trim()
    const combinedLeadText = `${leadAreaRaw} ${leadLocationRaw} ${leadNotesRaw}`.toLowerCase()

    // 案件の希望曜日セットを抽出
    const targetDays = Array.from(new Set([
        ...extractDaysFromDateStr(lead.datetime1),
        ...extractDaysFromDateStr(lead.datetime2),
        ...extractDaysFromDateStr(lead.datetime3),
        ...extractDaysFromDateStr(lead.available_times),
    ]))

    // 各コーチの個別 Webhook URL を解決しながらマッチングスコアを計算
    const candidates: MatchCandidate[] = []
    const allValidCoachesWithWebhook: MatchCandidate[] = []

    for (const coach of coaches) {
        // コーチ専用の Google Chat Webhook を解決
        const { webhookUrl, coachName } = await getCoachGoogleChatWebhookUrl(supabaseAdmin, coach.id, coach.full_name)
        if (!webhookUrl) {
            // Webhook未設定のコーチは送信先がないためスキップ
            continue
        }

        const candidateBase: MatchCandidate = {
            coachId: coach.id,
            coachName: coachName || coach.full_name || 'コーチ',
            webhookUrl,
            score: 0,
            matchedReasons: [],
            matchedStations: [],
            matchedFacilities: [],
            matchedDays: [],
        }

        allValidCoachesWithWebhook.push(candidateBase)

        // コーチの最寄駅・プール・カスタム場所設定
        const locConfig = locationConfigMap.get(coach.id)
        const coachStations = locConfig?.stations || []
        const coachFacilityNames = (locConfig?.facilityIds || []).map(id => facilityMap.get(id) || '').filter(Boolean)
        const coachCustomLocations = locConfig?.customLocations || []

        // コーチの過去レッスン実績場所
        const pastLessonLocations = ((allLessons || []) as Array<{ coach_id: string; location: string | null }>)
            .filter((l: { coach_id: string; location: string | null }) => l.coach_id === coach.id && l.location && l.location.trim() && l.location !== 'キャンセル')
            .map((l: { coach_id: string; location: string | null }) => l.location!.trim())

        // コーチの登録稼働枠
        const coachAvails = ((allAvailabilities || []) as Array<{ coach_id: string; day_of_week: string; time_of_day: string; area: string }>)
            .filter((a: { coach_id: string }) => a.coach_id === coach.id)

        let isAreaMatched = false
        let isDateMatched = false

        // --- A. エリア/最寄駅/プール マッチング ---
        // 1. 最寄駅との照合
        for (const st of coachStations) {
            const cleanSt = cleanLocationKeyword(st)
            if (cleanSt.length >= 2 && combinedLeadText.includes(cleanSt)) {
                if (!candidateBase.matchedStations.includes(st)) {
                    candidateBase.matchedStations.push(st)
                }
                isAreaMatched = true
            }
        }

        // 2. 登録プールとの照合
        for (const facName of [...coachFacilityNames, ...coachCustomLocations]) {
            const cleanFac = cleanLocationKeyword(facName)
            if (cleanFac.length >= 3 && (combinedLeadText.includes(cleanFac) || cleanFac.includes(cleanLocationKeyword(leadAreaRaw)))) {
                if (!candidateBase.matchedFacilities.includes(facName)) {
                    candidateBase.matchedFacilities.push(facName)
                }
                isAreaMatched = true
            }
        }

        // 3. 過去レッスン実績場所との照合（ユーザー要望: 実績がある場所の紐付け）
        for (const pastLoc of pastLessonLocations) {
            const cleanPast = cleanLocationKeyword(pastLoc)
            if (cleanPast.length >= 3 && (combinedLeadText.includes(cleanPast) || (leadAreaRaw && cleanPast.includes(cleanLocationKeyword(leadAreaRaw))))) {
                const label = `${pastLoc}(実績)`
                if (!candidateBase.matchedFacilities.includes(pastLoc) && !candidateBase.matchedFacilities.includes(label)) {
                    candidateBase.matchedFacilities.push(label)
                }
                isAreaMatched = true
            }
        }

        // 4. base_area との照合
        if (coach.base_area) {
            const cleanBase = cleanLocationKeyword(coach.base_area)
            const cleanLeadArea = cleanLocationKeyword(leadAreaRaw)
            if (cleanLeadArea && cleanLeadArea.length >= 2 && cleanBase.includes(cleanLeadArea)) {
                isAreaMatched = true
            }
        }

        // --- B. 曜日・日程 マッチング ---
        if (targetDays.length > 0 && coachAvails.length > 0) {
            for (const day of targetDays) {
                const hasDay = coachAvails.some(a => a.day_of_week === day)
                if (hasDay) {
                    candidateBase.matchedDays.push(day)
                    isDateMatched = true
                }
            }
        }

        // スコアリング
        let score = 0
        if (candidateBase.matchedStations.length > 0) {
            score += 40
            candidateBase.matchedReasons.push(`最寄駅一致 (${candidateBase.matchedStations.join('、')})`)
        }
        if (candidateBase.matchedFacilities.length > 0) {
            score += 40
            candidateBase.matchedReasons.push(`プール・実績一致 (${candidateBase.matchedFacilities.join('、')})`)
        }
        if (isAreaMatched && candidateBase.matchedStations.length === 0 && candidateBase.matchedFacilities.length === 0) {
            score += 30
            candidateBase.matchedReasons.push('基本エリア一致')
        }
        if (candidateBase.matchedDays.length > 0) {
            score += 20
            candidateBase.matchedReasons.push(`希望曜日一致 (${candidateBase.matchedDays.join('、')})`)
        }

        candidateBase.score = score

        // エリアがマッチしているか、または総合スコアが基準以上の場合は候補に選定
        if (isAreaMatched || score >= 40) {
            candidates.push(candidateBase)
        }
    }

    // スコア降順にソート
    candidates.sort((a, b) => b.score - a.score)

    // --- パターンA ＋ 2名以下全員送信 ルール判定 ---
    // 対象コーチが3名以上ならマッチしたコーチへ送信、2名以下なら全アクティブコーチへ送信
    if (candidates.length >= 3) {
        return {
            leadId: lead.id,
            selectedCoaches: candidates,
            allActiveCoachesCount: allValidCoachesWithWebhook.length,
            mode: 'matched',
            reason: `条件（最寄駅・プール・曜日）に適合するコーチが ${candidates.length} 名見つかりました。`,
        }
    } else {
        return {
            leadId: lead.id,
            selectedCoaches: allValidCoachesWithWebhook,
            allActiveCoachesCount: allValidCoachesWithWebhook.length,
            mode: 'broadcast_all',
            reason: candidates.length === 0
                ? '条件に完全合致するコーチが不在だったため、全コーチへご案内します。'
                : `合致するコーチが ${candidates.length} 名（2名以下）だったため、全コーチへご案内します。`,
        }
    }
}

/**
 * 新規案件を適格コーチの個別 Google Chat スペースへ自動送信する
 */
export async function dispatchNewLeadToMatchingCoaches(
    leadId: string,
    options?: { siteUrl?: string }
): Promise<{
    success: boolean
    sentCount: number
    mode: 'matched' | 'broadcast_all'
    recipientCoaches: string[]
    reason: string
    error?: string
}> {
    try {
        const supabaseAdmin = createAdminClient()

        // 1. リード情報の取得
        const { data: lead, error: leadError } = await supabaseAdmin
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .single()

        if (leadError || !lead) {
            return {
                success: false,
                sentCount: 0,
                mode: 'broadcast_all',
                recipientCoaches: [],
                reason: 'リードが見つかりません',
                error: 'Lead not found',
            }
        }

        // 2. マッチング実行
        const matchResult = await selectMatchingCoachesForLead(lead, supabaseAdmin)
        const targetCoaches = matchResult.selectedCoaches

        if (targetCoaches.length === 0) {
            console.warn(`[Dispatch Lead] No valid coaches with webhooks found for lead: ${leadId}`)
            return {
                success: true,
                sentCount: 0,
                mode: matchResult.mode,
                recipientCoaches: [],
                reason: '送信可能なWebhookを持つコーチがいませんでした',
            }
        }

        const siteUrl = options?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://crm.swim-partners.com'
        const assignUrl = `${siteUrl}/coach/leads`

        // 3. 各コーチ個別スペースへの送信メッセージ作成
        const isBroadcastAll = matchResult.mode === 'broadcast_all'
        const modeBadge = isBroadcastAll
            ? '📢 *【新規案件・全コーチご案内】*'
            : '🎯 *【新規案件・あなたへの優先ご案内】*'

        const reasonNote = isBroadcastAll
            ? `※対象エリアの登録コーチが2名以下のため、全コーチへ一斉にご案内しております。`
            : `※ご登録の最寄駅・プール・過去レッスン実績の条件に基づき、対応可能なコーチとしてご案内しております。`

        const recipientNames: string[] = []
        let sentCount = 0

        for (const candidate of targetCoaches) {
            const personalReasons = candidate.matchedReasons.length > 0
                ? `\n・マッチ項目: ${candidate.matchedReasons.join(' / ')}`
                : ''

            const message = [
                modeBadge,
                `${candidate.coachName} コーチ`,
                '',
                '新しい体験レッスンのお申し込みが入りました。',
                reasonNote,
                personalReasons,
                '',
                '────────────────',
                '*■ 案件情報*',
                `・お名前: ${lead.name || 'お客様'} 様（${lead.full_name_kana || ''}）`,
                `・希望エリア/最寄駅: ${lead.area || '未指定'}`,
                `・第1希望: ${lead.datetime1 || '未指定'}`,
                `・第2希望: ${lead.datetime2 || '未指定'}`,
                `・第3希望: ${lead.datetime3 || '未指定'}`,
                `・可能な曜日・時間帯: ${lead.available_times || '未指定'}`,
                `・泳力・目標: ${lead.skill_level || 'なし'}`,
                lead.notes ? `・その他ご要望: ${lead.notes}` : '',
                '────────────────',
                '',
                '担当をご希望の方は、下記ページより「アサインする」ボタンを押してください。',
                '（※先着順となります）',
                '',
                `👉 *案件確認・立候補はこちら:*`,
                assignUrl,
            ].filter(Boolean).join('\n')

            try {
                const sent = await sendGoogleChatMessage(candidate.webhookUrl, message)
                if (sent) {
                    sentCount++
                    recipientNames.push(candidate.coachName)
                    console.log(`[Dispatch Lead] Sent to coach individual space: ${candidate.coachName} (${candidate.coachId})`)
                } else {
                    console.warn(`[Dispatch Lead] Failed to send to coach space: ${candidate.coachName}`)
                }
            } catch (postErr) {
                console.error(`[Dispatch Lead] Error posting to webhook for coach ${candidate.coachName}:`, postErr)
            }
        }

        console.log(`[Dispatch Lead] Complete! Mode: ${matchResult.mode}, Sent: ${sentCount}/${targetCoaches.length} coaches.`)

        return {
            success: true,
            sentCount,
            mode: matchResult.mode,
            recipientCoaches: recipientNames,
            reason: matchResult.reason,
        }
    } catch (err: any) {
        console.error('[Dispatch Lead] Exception in dispatchNewLeadToMatchingCoaches:', err)
        return {
            success: false,
            sentCount: 0,
            mode: 'broadcast_all',
            recipientCoaches: [],
            reason: err.message || '送信中にエラーが発生しました',
            error: err.message,
        }
    }
}
