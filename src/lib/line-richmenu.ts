import { createAdminClient } from '@/lib/supabase/admin'

const LINE_API_BASE = 'https://api.line.me/v2/bot'

/**
 * LINE Channel Access Token を取得（環境変数または設定から）
 */
export async function getLineChannelAccessToken(): Promise<string | null> {
    const envToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (envToken) return envToken

    try {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('app_configs')
            .select('value')
            .eq('key', 'line_channel_access_token')
            .maybeSingle()
        return data?.value || null
    } catch {
        return null
    }
}

/**
 * リッチメニュー設定を取得（会員用リッチメニューID等）
 */
export async function getRichMenuSettings(): Promise<{
    memberRichMenuId: string | null
    defaultRichMenuId: string | null
}> {
    try {
        const supabase = createAdminClient()
        const { data } = await supabase
            .from('app_configs')
            .select('key, value')
            .in('key', ['line_member_rich_menu_id', 'line_default_rich_menu_id'])

        const configMap = new Map((data || []).map(d => [d.key, d.value]))
        return {
            memberRichMenuId: configMap.get('line_member_rich_menu_id') || null,
            defaultRichMenuId: configMap.get('line_default_rich_menu_id') || null,
        }
    } catch (err) {
        console.error('[LineRichMenu] Failed to get rich menu settings:', err)
        return { memberRichMenuId: null, defaultRichMenuId: null }
    }
}

/**
 * リッチメニュー設定を保存
 */
export async function saveRichMenuSettings(params: {
    memberRichMenuId?: string
    defaultRichMenuId?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = createAdminClient()
        const now = new Date().toISOString()
        const upserts = []

        if (params.memberRichMenuId !== undefined) {
            upserts.push({
                key: 'line_member_rich_menu_id',
                value: params.memberRichMenuId.trim(),
                description: '入会済み会員に表示するLINEリッチメニューID (richmenu-xxx)',
                updated_at: now,
            })
        }

        if (params.defaultRichMenuId !== undefined) {
            upserts.push({
                key: 'line_default_rich_menu_id',
                value: params.defaultRichMenuId.trim(),
                description: '初回・見込み客用のデフォルトリッチメニューID',
                updated_at: now,
            })
        }

        if (upserts.length > 0) {
            const { error } = await supabase.from('app_configs').upsert(upserts)
            if (error) throw error
        }

        return { success: true }
    } catch (err: any) {
        console.error('[LineRichMenu] Failed to save settings:', err)
        return { success: false, error: err.message }
    }
}

/**
 * 指定したユーザー（LINE User ID）に会員用リッチメニューをリンク（付与）
 */
export async function linkMemberRichMenuToUser(
    lineUserId: string,
    explicitRichMenuId?: string
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    if (!lineUserId || !/^U[0-9a-f]{32}$/i.test(lineUserId.trim())) {
        return { success: false, error: '有効なLINEユーザーIDではありません。' }
    }

    const token = await getLineChannelAccessToken()
    if (!token) {
        return { success: false, error: 'LINEチャネルアクセストークンが未設定です。' }
    }

    let richMenuId = explicitRichMenuId
    if (!richMenuId) {
        const settings = await getRichMenuSettings()
        richMenuId = settings.memberRichMenuId || undefined
    }

    if (!richMenuId) {
        console.warn('[LineRichMenu] memberRichMenuId is not configured. Skipped linking.')
        return { success: true, skipped: true }
    }

    try {
        const res = await fetch(`${LINE_API_BASE}/user/${lineUserId.trim()}/richmenu/${richMenuId.trim()}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!res.ok) {
            const text = await res.text()
            console.error(`[LineRichMenu] Link error for ${lineUserId}:`, res.status, text)
            return { success: false, error: `LINE API Error (${res.status}): ${text}` }
        }

        console.log(`[LineRichMenu] Successfully linked member rich menu (${richMenuId}) to user ${lineUserId}`)
        return { success: true }
    } catch (err: any) {
        console.error(`[LineRichMenu] Network error linking user ${lineUserId}:`, err)
        return { success: false, error: err.message }
    }
}

/**
 * 指定したユーザーから個別リッチメニューを解除（デフォルトメニューに戻す）
 */
export async function unlinkRichMenuFromUser(
    lineUserId: string
): Promise<{ success: boolean; error?: string }> {
    if (!lineUserId || !/^U[0-9a-f]{32}$/i.test(lineUserId.trim())) {
        return { success: false, error: '有効なLINEユーザーIDではありません。' }
    }

    const token = await getLineChannelAccessToken()
    if (!token) {
        return { success: false, error: 'LINEチャネルアクセストークンが未設定です。' }
    }

    try {
        const res = await fetch(`${LINE_API_BASE}/user/${lineUserId.trim()}/richmenu`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!res.ok && res.status !== 404) {
            const text = await res.text()
            console.error(`[LineRichMenu] Unlink error for ${lineUserId}:`, res.status, text)
            return { success: false, error: `LINE API Error (${res.status}): ${text}` }
        }

        console.log(`[LineRichMenu] Successfully unlinked rich menu from user ${lineUserId}`)
        return { success: true }
    } catch (err: any) {
        console.error(`[LineRichMenu] Network error unlinking user ${lineUserId}:`, err)
        return { success: false, error: err.message }
    }
}

/**
 * 現在のすべての有効会員（status = 'active'）に会員用リッチメニューを一括リンク
 */
export async function syncAllActiveMembersRichMenuAction(): Promise<{
    success: boolean
    linkedCount: number
    totalActiveWithLine: number
    error?: string
}> {
    const token = await getLineChannelAccessToken()
    if (!token) {
        return { success: false, linkedCount: 0, totalActiveWithLine: 0, error: 'LINEアクセストークンが設定されていません。' }
    }

    const settings = await getRichMenuSettings()
    if (!settings.memberRichMenuId) {
        return { success: false, linkedCount: 0, totalActiveWithLine: 0, error: '会員用リッチメニューIDが設定されていません。先に設定を保存してください。' }
    }

    const supabase = createAdminClient()
    const { data: students, error: studentErr } = await supabase
        .from('students')
        .select('id, full_name, line_user_id, status')
        .eq('status', 'active')
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '')

    if (studentErr) {
        return { success: false, linkedCount: 0, totalActiveWithLine: 0, error: studentErr.message }
    }

    const validUserIds = Array.from(new Set(
        (students || [])
            .map(s => s.line_user_id?.trim())
            .filter((id): id is string => !!id && /^U[0-9a-f]{32}$/i.test(id))
    ))

    if (validUserIds.length === 0) {
        return { success: true, linkedCount: 0, totalActiveWithLine: 0 }
    }

    // LINE API の一括リンクエンドポイントは最大500件ずつ
    const chunkSize = 500
    let totalLinked = 0

    for (let i = 0; i < validUserIds.length; i += chunkSize) {
        const chunk = validUserIds.slice(i, i + chunkSize)
        try {
            const res = await fetch(`${LINE_API_BASE}/richmenu/bulk/link`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    richMenuId: settings.memberRichMenuId.trim(),
                    userIds: chunk,
                }),
            })

            if (res.ok || res.status === 202) {
                totalLinked += chunk.length
            } else {
                const errText = await res.text()
                console.error('[syncAllActiveMembersRichMenu] Bulk link error:', res.status, errText)
            }
        } catch (e) {
            console.error('[syncAllActiveMembersRichMenu] Network error:', e)
        }
    }

    return {
        success: true,
        linkedCount: totalLinked,
        totalActiveWithLine: validUserIds.length,
    }
}
