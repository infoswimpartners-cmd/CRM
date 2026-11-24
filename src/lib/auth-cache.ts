import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * 1リクエスト内で Supabase Auth の getUser() 呼び出しをメモ化する。
 * React の cache() はリクエストスコープ限定のため、ユーザー間で認証情報が共有されることはない。
 */
export const getCachedAuthUser = cache(async () => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
})

/**
 * 1リクエスト内でログイン中ユーザーの profile をメモ化して取得する。
 * DashboardLayout と各ページ間での重複クエリを防止する。
 */
export const getCachedProfile = cache(async () => {
    const { user, error: userError } = await getCachedAuthUser()
    if (!user || userError) {
        return { user: null, userError, profile: null }
    }

    const supabase = await createClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('*, coach_number')
        .eq('id', user.id)
        .single()

    return { user, userError: null, profile }
})
