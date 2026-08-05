'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type LineMonitoringLog = {
    id: string
    coach_id: string
    line_user_id: string
    line_display_name: string | null
    message_text: string
    direction: 'customer_to_coach' | 'coach_to_customer'
    status: 'unread' | 'checked'
    detected_at: string
    coach_name?: string | null
}

export type LineBotConfig = {
    id: string
    coach_id: string
    bot_id: string
    bot_name: string
    created_at: string
    coach_name?: string | null
}

/**
 * 管理者権限を検証する内部ヘルパー
 */
async function verifyAdminRole() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { isAuthorized: false, user: null }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    return {
        isAuthorized: profile?.role === 'admin',
        user
    }
}

/**
 * 日程監視ログを一覧取得します（管理者のみ）
 */
export async function getLineMonitoringLogsAction(filters?: {
    coachId?: string
    status?: 'unread' | 'checked' | 'all'
    dateFrom?: string
    dateTo?: string
}) {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized', data: [] }
    }

    const supabase = await createClient()
    let query = supabase
        .from('line_monitoring_logs')
        .select(`
            *,
            profiles:coach_id (full_name)
        `)
        .order('detected_at', { ascending: false })

    if (filters) {
        if (filters.coachId && filters.coachId !== 'all') {
            query = query.eq('coach_id', filters.coachId)
        }
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status)
        }
        if (filters.dateFrom) {
            query = query.gte('detected_at', filters.dateFrom)
        }
        if (filters.dateTo) {
            query = query.lte('detected_at', filters.dateTo)
        }
    }

    const { data, error } = await query

    if (error) {
        console.error('getLineMonitoringLogsAction Error:', error)
        return { success: false, error: error.message, data: [] }
    }

    const formattedData = (data || []).map((log: any) => ({
        ...log,
        coach_name: log.profiles?.full_name || '不明なコーチ'
    }))

    return { success: true, data: formattedData }
}

/**
 * ログの確認ステータスを更新します（管理者・担当コーチ）
 */
export async function updateLogStatusAction(logId: string, status: 'unread' | 'checked') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    // ユーザーが管理者か、または該当ログの担当コーチであることを確認
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
    
    const isAdmin = profile?.role === 'admin'

    const { data: log } = await supabase
        .from('line_monitoring_logs')
        .select('coach_id')
        .eq('id', logId)
        .single()

    const isCoachOwner = log?.coach_id === user.id

    if (!isAdmin && !isCoachOwner) {
        return { success: false, error: 'Forbidden' }
    }

    const { error } = await supabase
        .from('line_monitoring_logs')
        .update({ status })
        .eq('id', logId)

    if (error) {
        console.error('updateLogStatusAction Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/line-monitoring')
    return { success: true }
}

/**
 * LINEボットの紐付け設定一覧を取得します（管理者のみ）
 */
export async function getLineBotConfigsAction() {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized', data: [] }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('line_bot_configs')
        .select(`
            *,
            profiles:coach_id (full_name),
            google_chat_webhooks:gchat_webhook_id (space_name)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('getLineBotConfigsAction Error:', error)
        return { success: false, error: error.message, data: [] }
    }

    const formattedData = (data || []).map((config: any) => ({
        ...config,
        coach_name: config.profiles?.full_name || '不明なコーチ',
        space_name: config.google_chat_webhooks?.space_name || null
    }))

    return { success: true, data: formattedData }
}

/**
 * LINEボット紐付け設定を新規登録・更新します（管理者のみ）
 */
export async function saveLineBotConfigAction(data: {
    id?: string
    coach_id: string
    bot_id: string
    bot_name: string
    gchat_webhook_id?: string | null
}) {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const cleanBotId = data.bot_id.trim()
    const cleanBotName = data.bot_name.trim()
    const gchatWebhookId = data.gchat_webhook_id || null

    // 1. 同一 bot_id が自分以外で既に登録されていないか事前チェック
    let checkQuery = supabase
        .from('line_bot_configs')
        .select('id, bot_name, profiles:coach_id(full_name)')
        .eq('bot_id', cleanBotId)

    if (data.id) {
        checkQuery = checkQuery.neq('id', data.id)
    }

    const { data: existingConfig } = await checkQuery.maybeSingle()

    if (existingConfig) {
        const coachName = (existingConfig as any).profiles?.full_name || '他のアカウント'
        return { 
            success: false, 
            error: `このボットID（${cleanBotId}）はすでに「${coachName}」の設定（${existingConfig.bot_name}）として登録されています。一覧の「編集」ボタンから変更するか、別のボットIDを指定してください。` 
        }
    }

    if (data.id) {
        // 更新
        const { error } = await supabase
            .from('line_bot_configs')
            .update({
                coach_id: data.coach_id,
                bot_id: cleanBotId,
                bot_name: cleanBotName,
                gchat_webhook_id: gchatWebhookId
            })
            .eq('id', data.id)

        if (error) {
            console.error('saveLineBotConfigAction Update Error:', error)
            return { success: false, error: '設定の更新に失敗しました: ' + error.message }
        }
    } else {
        // 新規作成
        const { error } = await supabase
            .from('line_bot_configs')
            .insert({
                coach_id: data.coach_id,
                bot_id: cleanBotId,
                bot_name: cleanBotName,
                gchat_webhook_id: gchatWebhookId
            })

        if (error) {
            console.error('saveLineBotConfigAction Insert Error:', error)
            if (error.code === '23505') {
                return { success: false, error: 'このボットIDは既に登録されています。既存の設定を編集してください。' }
            }
            return { success: false, error: '設定の保存に失敗しました: ' + error.message }
        }
    }

    revalidatePath('/admin/line-monitoring')
    return { success: true }
}

/**
 * LINEボット紐付け設定を削除します（管理者のみ）
 */
export async function deleteLineBotConfigAction(configId: string) {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized' }
    }

    const supabase = await createClient()
    const { error } = await supabase
        .from('line_bot_configs')
        .delete()
        .eq('id', configId)

    if (error) {
        console.error('deleteLineBotConfigAction Error:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/admin/line-monitoring')
    return { success: true }
}

/**
 * 監視対象になりうるコーチおよび管理者の一覧を取得します（管理者のみ）
 */
export async function getCoachesListAction() {
    const { isAuthorized } = await verifyAdminRole()
    if (!isAuthorized) {
        return { success: false, error: 'Unauthorized', data: [] }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .or('role.eq.coach,role.eq.admin')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('getCoachesListAction Error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data }
}

/**
 * LINEのユーザーIDまたは表示名から生徒を検索・特定します（管理者およびコーチのみ）
 */
export async function findStudentByLineInfoAction(lineUserId: string, displayName?: string | null) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    // 1. LINEのユーザーIDで完全一致検索
    const { data: directMatch, error: directError } = await supabase
        .from('students')
        .select('id, full_name, line_user_id')
        .eq('line_user_id', lineUserId)
        .maybeSingle()

    if (directError) {
        console.error('findStudentByLineInfoAction directMatch error:', directError)
    }

    if (directMatch) {
        return { success: true, match: directMatch, candidates: [] }
    }

    // 2. 一致しない場合は、表示名（displayName）で部分一致する生徒を候補として検索
    let candidates: any[] = []
    if (displayName) {
        const { data: matched, error: matchError } = await supabase
            .from('students')
            .select('id, full_name, line_user_id')
            .or(`full_name.ilike.%${displayName}%,second_student_name.ilike.%${displayName}%`)
            .limit(5)

        if (matchError) {
            console.error('findStudentByLineInfoAction candidates error:', matchError)
        } else {
            candidates = matched || []
        }
    }

    return { success: true, match: null, candidates }
}

/**
 * レッスン種別（マスタ）の一覧を取得します（管理者およびコーチのみ）
 */
export async function getLessonMastersListAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized', data: [] }

    const { data, error } = await supabase
        .from('lesson_masters')
        .select('id, name, price, is_trial')
        .order('name', { ascending: true })

    if (error) {
        console.error('getLessonMastersListAction Error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data }
}

/**
 * 生徒の簡易一覧を取得します（管理者およびコーチのみ）
 */
export async function getStudentsSimpleListAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized', data: [] }

    const { data, error } = await supabase
        .from('students')
        .select('id, full_name')
        .order('full_name', { ascending: true })

    if (error) {
        console.error('getStudentsSimpleListAction Error:', error)
        return { success: false, error: error.message, data: [] }
    }

    return { success: true, data }
}
