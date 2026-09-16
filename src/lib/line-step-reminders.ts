import { createAdminClient } from '@/lib/supabase/admin'
import { sendGoogleChatMessage } from '@/lib/google-chat'

const OFFICIAL_BOT_USER_ID = 'U97d99b9c221da2a8232e81e79f1b1bd9'
const OFFICIAL_BOT_BASIC_ID = '@607ekntf'
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

export interface StepLeadState {
    line_user_id: string
    display_name: string | null
    status: 'friend_only' | 'inquired' | 'applied' | 'trial_done' | 'active' | 'withdrawn'
    step_stage: number // 0: 未送信, 1: 24h送信済, 2: 72h送信済, 3: 120h送信済, -1: 停止
    followed_at: string
    next_send_at: string | null
    last_sent_at: string | null
    is_blocked: boolean
    notes?: string
}

/**
 * 事務局公式LINE宛てのメッセージをプッシュ送信するヘルパー
 */
async function pushOfficialLineMessage(toUserId: string, text: string): Promise<boolean> {
    if (!LINE_CHANNEL_ACCESS_TOKEN || !toUserId) return false

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: toUserId,
                messages: [{ type: 'text', text }]
            })
        })

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            console.error('[Official LINE Step] Push message failed:', err)
            return false
        }
        return true
    } catch (e) {
        console.error('[Official LINE Step] Network error pushing message:', e)
        return false
    }
}

/**
 * 送信先のボットが事務局公式LINE（会社代表アカウント）かどうか判定
 */
export function isOfficialBotDestination(destination: string): boolean {
    if (!destination) return false
    const clean = destination.trim().toLowerCase()
    return clean === OFFICIAL_BOT_USER_ID.toLowerCase() || 
           clean === OFFICIAL_BOT_BASIC_ID.toLowerCase() ||
           clean === OFFICIAL_BOT_BASIC_ID.replace('@', '').toLowerCase()
}

/**
 * 事務局公式LINEのステップ配信状態を取得
 */
export async function getStepLeadState(lineUserId: string): Promise<StepLeadState | null> {
    const supabase = createAdminClient()
    const configKey = `line_step:${lineUserId}`

    const { data } = await supabase
        .from('app_configs')
        .select('value')
        .eq('key', configKey)
        .maybeSingle()

    if (!data?.value) return null
    try {
        return JSON.parse(data.value) as StepLeadState
    } catch {
        return null
    }
}

/**
 * 事務局公式LINEのステップ配信状態を保存
 */
export async function saveStepLeadState(state: StepLeadState): Promise<void> {
    const supabase = createAdminClient()
    const configKey = `line_step:${state.line_user_id}`

    await supabase.from('app_configs').upsert({
        key: configKey,
        value: JSON.stringify(state),
        description: `LINE公式ステップ配信状態: ${state.display_name || state.line_user_id} (${state.status})`,
        updated_at: new Date().toISOString()
    })
}

/**
 * 事務局公式LINEのフォロー（友だち追加）イベントを処理
 */
export async function handleOfficialLineFollow(lineUserId: string, displayName?: string | null): Promise<void> {
    const supabase = createAdminClient()

    // 1. 既存の生徒データがあるか確認
    const { data: existingStudent } = await supabase
        .from('students')
        .select('id, status, full_name')
        .eq('line_user_id', lineUserId)
        .maybeSingle()

    const now = new Date()
    const followedAt = now.toISOString()

    // 既に生徒として登録済み（申込済、体験済、入会済、退会済）の場合
    if (existingStudent && existingStudent.status && existingStudent.status !== 'friend_only') {
        const state: StepLeadState = {
            line_user_id: lineUserId,
            display_name: displayName || existingStudent.full_name,
            status: existingStudent.status as any,
            step_stage: -1, // 配信対象外
            followed_at: followedAt,
            next_send_at: null,
            last_sent_at: null,
            is_blocked: false
        }
        await saveStepLeadState(state)
        console.log(`[Official LINE Step] Followed by existing student (${existingStudent.full_name}, status: ${existingStudent.status}). Step reminders skipped.`)
        return
    }

    // 新規未申込リードの場合（24時間後にStep 1配信をセット）
    const nextSendAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    const state: StepLeadState = {
        line_user_id: lineUserId,
        display_name: displayName || 'LINE友だち',
        status: 'friend_only',
        step_stage: 0,
        followed_at: followedAt,
        next_send_at: nextSendAt,
        last_sent_at: null,
        is_blocked: false
    }
    await saveStepLeadState(state)

    // CRMの students テーブルにも「LINE友だち追加のみ」として連携登録
    if (!existingStudent) {
        const { error: insertErr } = await supabase
            .from('students')
            .insert({
                full_name: displayName || '公式LINE友だち',
                line_user_id: lineUserId,
                status: 'friend_only',
                notes: '公式LINE友だち追加（未申込）'
            })
        if (insertErr) {
            console.error('[Official LINE Step] Failed to insert student as friend_only:', insertErr)
        } else {
            console.log(`[Official LINE Step] Registered new student record as friend_only: ${displayName || lineUserId}`)
        }
    } else {
        await supabase
            .from('students')
            .update({ status: 'friend_only' })
            .eq('id', existingStudent.id)
    }
}

/**
 * 事務局公式LINEのアンフォロー（ブロック）イベントを処理
 */
export async function handleOfficialLineUnfollow(lineUserId: string): Promise<void> {
    const state = await getStepLeadState(lineUserId)
    if (state) {
        state.is_blocked = true
        state.step_stage = -1
        state.next_send_at = null
        await saveStepLeadState(state)
    }
    console.log(`[Official LINE Step] Official bot unfollowed/blocked by ${lineUserId}. Step stopped.`)
}

/**
 * ユーザーからのメッセージ受信時にステップ配信を即時停止＆管理者通知
 */
export async function handleOfficialLineMessage(lineUserId: string, messageText: string, displayName?: string | null): Promise<void> {
    const supabase = createAdminClient()
    const state = await getStepLeadState(lineUserId)

    // もしステップ配信対象中であれば即座に停止
    if (state && (state.step_stage >= 0 || state.status === 'friend_only')) {
        state.status = 'inquired' // 問い合わせ・相談中へ
        state.step_stage = -1    // 配信停止
        state.next_send_at = null
        await saveStepLeadState(state)

        // studentsテーブルも「問い合わせ・相談中」に更新
        await supabase
            .from('students')
            .update({ status: 'inquired' })
            .eq('line_user_id', lineUserId)

        console.log(`[Official LINE Step] User message received from ${displayName || lineUserId}. Status changed to inquired & step reminder stopped!`)
    }

    // 管理者専用「公式ラインチャットグループ」へ相談検知通知
    let webhookUrl: string | null = null

    // 1. 管理者設定（email_triggers: line_schedule_detected）を第一優先で参照
    const { data: adminTrigger } = await supabase
        .from('email_triggers')
        .select('google_chat_webhook_url, google_chat_enabled')
        .eq('id', 'line_schedule_detected')
        .maybeSingle()

    if (adminTrigger && adminTrigger.google_chat_enabled !== false && adminTrigger.google_chat_webhook_url) {
        webhookUrl = adminTrigger.google_chat_webhook_url
    }

    // 2. 未設定の場合、google_chat_webhooksの「公式ラインチャットグループ」をフォールバック検索
    if (!webhookUrl) {
        const { data: defaultWebhook } = await supabase
            .from('google_chat_webhooks')
            .select('webhook_url')
            .or('space_name.ilike.%公式ライン%,space_name.ilike.%日程調整%')
            .eq('active', true)
            .limit(1)
            .maybeSingle()

        if (defaultWebhook?.webhook_url) {
            webhookUrl = defaultWebhook.webhook_url
        }
    }

    // 3. 環境変数を最終フォールバック
    if (!webhookUrl) {
        webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL || null
    }

    if (webhookUrl) {
        const chatMessage = `💬 *【公式ラインチャットグループ通知】見込み客からメッセージを受信しました*\n` +
                            `・顧客名: ${displayName || '公式LINEユーザー'} 様\n` +
                            `・LINE ID: \`${lineUserId}\`\n` +
                            `・受信内容:\n「${messageText}」\n` +
                            `・対応状況: 自動ステップ配信を停止し、ステータスを「問い合わせ・相談中」に更新しました。\n` +
                            `・検知日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n` +
                            `※LINE公式アカウント管理画面にて有人チャット対応をお願いします。`
        try {
            await sendGoogleChatMessage(webhookUrl, chatMessage)
        } catch (e) {
            console.error('[Official LINE Step] Failed to notify Google Chat:', e)
        }
    }
}

/**
 * ステップ配信を外部から即時停止するヘルパー（体験申込時やCRMでの手動変更時）
 */
export async function stopStepReminderForUser(lineUserId: string, newStatus: string = 'applied'): Promise<void> {
    const state = await getStepLeadState(lineUserId)
    if (state) {
        state.status = newStatus as any
        state.step_stage = -1
        state.next_send_at = null
        await saveStepLeadState(state)
        console.log(`[Official LINE Step] Stopped step reminder for ${lineUserId}. New status: ${newStatus}`)
    }
}

/**
 * 毎時バッチ: ステップ配信を実行
 */
export async function processLineStepReminders(options: { dryRun?: boolean } = {}) {
    const { dryRun = false } = options
    const supabase = createAdminClient()
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'
    const trialFormUrl = `${appUrl}/trial`

    // 全ての line_step:* 設定を取得
    const { data: configs } = await supabase
        .from('app_configs')
        .select('key, value')
        .like('key', 'line_step:%')

    const now = new Date()
    const nowIso = now.toISOString()
    const results: any[] = []

    for (const cfg of configs || []) {
        let state: StepLeadState
        try {
            state = JSON.parse(cfg.value) as StepLeadState
        } catch {
            continue
        }

        // 配信対象の条件判定
        if (state.is_blocked) continue
        if (state.step_stage < 0 || state.step_stage >= 3) continue
        if (state.status !== 'friend_only') continue
        if (!state.next_send_at || state.next_send_at > nowIso) continue

        // 直前ガード: students テーブルで status が変更されていないか再チェック
        const { data: student } = await supabase
            .from('students')
            .select('status, student_number')
            .eq('line_user_id', state.line_user_id)
            .maybeSingle()

        if (student && student.status !== 'friend_only') {
            state.status = student.status as any
            state.step_stage = -1
            state.next_send_at = null
            await saveStepLeadState(state)
            continue
        }

        const name = state.display_name || 'お客様'
        let messageText = ''
        let nextStage = state.step_stage + 1
        let nextSendAt: string | null = null

        const followedDate = new Date(state.followed_at)

        // Stage 0 -> Step 1 (24時間後)
        if (state.step_stage === 0) {
            messageText = `${name} 様、昨日はSwim Partners公式LINEへのご登録ありがとうございます！事務局です😊\n\n` +
                          `「個人レッスンって、どこで練習するの？」と気になっている方も多いのではないでしょうか？\n\n` +
                          `当スクールでは、ご自宅近くの公営プールや区民プールへインストラクターが出張いたします！🏊‍♂️\n` +
                          `わざわざ遠くのスイミングスクールまで送迎する必要がなく、平日の夕方や土日祝日など、ご都合の良い日時で柔軟にレッスンが可能です✨\n\n` +
                          `まずは一度、お近くのプールで体験してみませんか？\n` +
                          `▼体験レッスンの詳細・空き状況はこちら\n` +
                          `${trialFormUrl}`

            // 次回は登録から72時間後
            nextSendAt = new Date(followedDate.getTime() + 72 * 60 * 60 * 1000).toISOString()
        } 
        // Stage 1 -> Step 2 (72時間後)
        else if (state.step_stage === 1) {
            messageText = `こんにちは！Swim Partners事務局です✨\n\n` +
                          `お子様の水泳について、こんなお悩みはありませんか？\n` +
                          `・スイミングスクールの進級テストで何度も落ちてしまっている…\n` +
                          `・水に顔をつけるのが怖くて泣いてしまう…\n` +
                          `・集団レッスンだと待ち時間が多くて泳ぐ量が少ない…\n\n` +
                          `集団スクールでは一人ひとりのペースに合わせるのが難しいですが、マンツーマン個人指導なら大丈夫です。\n` +
                          `お子様の表情や苦手なポイントに1対1でじっくり寄り添い、「できた！」という自信と笑顔を引き出します😊\n\n` +
                          `お子様専属のコーチと一緒に、最初の一歩を踏み出してみませんか？\n` +
                          `▼体験レッスンのお申し込みはこちら\n` +
                          `${trialFormUrl}`

            // 次回は登録から120時間後
            nextSendAt = new Date(followedDate.getTime() + 120 * 60 * 60 * 1000).toISOString()
        }
        // Stage 2 -> Step 3 (120時間後)
        else if (state.step_stage === 2) {
            messageText = `Swim Partners事務局です！\n\n` +
                          `「申し込みフォームを入力するのが少し面倒だな…」\n` +
                          `「近くにどんなプールやコーチがいるか相談してから決めたい」\n` +
                          `という方へ💡\n\n` +
                          `フォームを開かなくても、このLINEチャットにそのまま以下の3点を返信いただくだけで、事務局が最適なコーチ・日程をお探しいたします！\n\n` +
                          `-----------------------------\n` +
                          `① ご希望のエリア（例: ○○区、最寄りのプールなど）:\n` +
                          `② お子様の学年・現在のお悩み（例: 小1、水慣れから希望など）:\n` +
                          `③ 希望の曜日や時間帯（例: 土日の午前中など）:\n` +
                          `-----------------------------\n\n` +
                          `メッセージをいただきましたら、事務局スタッフより折り返しご案内メッセージをお送りいたします。\n` +
                          `ご質問だけでも大歓迎ですので、ぜひお気軽にこのチャットへご返信くださいね😊`

            // Step 3 完了
            nextStage = 3
            nextSendAt = null
        }

        if (dryRun) {
            results.push({
                line_user_id: state.line_user_id,
                name,
                step: state.step_stage + 1,
                dryRun: true
            })
            continue
        }

        // 実際に送信
        const success = await pushOfficialLineMessage(state.line_user_id, messageText)

        if (success) {
            state.step_stage = nextStage
            state.next_send_at = nextSendAt
            state.last_sent_at = nowIso
            await saveStepLeadState(state)

            results.push({
                line_user_id: state.line_user_id,
                name,
                step: nextStage,
                success: true
            })
            console.log(`[Official LINE Step] Sent Step ${nextStage} to ${name} (${state.line_user_id})`)
        } else {
            results.push({
                line_user_id: state.line_user_id,
                name,
                step: nextStage,
                success: false
            })
        }
    }

    return {
        processedCount: results.length,
        results
    }
}
