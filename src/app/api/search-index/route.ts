import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * グローバル検索（Cmd+K）用の遅延取得 API
 * ページ遷移ごとの不要な全件取得をなくし、検索モーダルを開いた時のみ認証・認可済みデータを並列取得する。
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (!user || userError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 権限チェックは必ずサーバー側で profiles から判定する
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const isAdmin = profile.role === 'admin' || profile.role === 'owner'

        const studentsPromise = supabase
            .from('students')
            .select('id, full_name, full_name_kana, avatar_url, student_number, contact_email, contact_phone')
            .order('full_name')

        const coachesPromise = isAdmin
            ? supabase
                .from('profiles')
                .select('id, full_name, avatar_url, coach_number')
                .in('role', ['coach', 'admin', 'owner'])
                .order('full_name')
            : Promise.resolve({ data: [] as any[] })

        const leadsPromise = isAdmin
            ? supabase
                .from('leads')
                .select('id, name, full_name_kana, email, phone')
                .order('created_at', { ascending: false })
            : supabase
                .from('leads')
                .select('id, name, full_name_kana, email, phone')
                .eq('status', '募集開始')
                .is('assigned_coach_id', null)
                .order('created_at', { ascending: false })

        const announcementsPromise = supabase
            .from('announcements')
            .select('id, title, content, published_at')
            .order('published_at', { ascending: false })
            .limit(100)

        const [
            { data: students },
            { data: coaches },
            { data: leads },
            { data: announcements },
        ] = await Promise.all([
            studentsPromise,
            coachesPromise,
            leadsPromise,
            announcementsPromise,
        ])

        return NextResponse.json({
            students: students || [],
            coaches: coaches || [],
            leads: leads || [],
            announcements: announcements || [],
        })
    } catch (error) {
        console.error('[search-index] Error fetching search data:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
