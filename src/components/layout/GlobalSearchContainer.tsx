import { createClient } from '@/lib/supabase/server'
import { GlobalSearch } from './GlobalSearch'

interface GlobalSearchContainerProps {
    isAdmin: boolean
}

export async function GlobalSearchContainer({ isAdmin }: GlobalSearchContainerProps) {
    const supabase = await createClient()

    // Data fetching
    const { data: students } = await supabase
        .from('students')
        .select('id, full_name, full_name_kana, avatar_url, student_number, contact_email, contact_phone')
        .order('full_name')

    let coaches: any[] = []
    let leads: any[] = []

    if (isAdmin) {
        const { data: fetchedCoaches } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, coach_number')
            .in('role', ['coach', 'admin', 'owner'])
            .order('full_name')
        coaches = fetchedCoaches || []

        const { data: fetchedLeads } = await supabase
            .from('leads')
            .select('id, name, full_name_kana, email, phone')
            .order('created_at', { ascending: false })
        leads = fetchedLeads || []
    } else {
        const { data: fetchedLeads } = await supabase
            .from('leads')
            .select('id, name, full_name_kana, email, phone')
            .eq('status', '募集開始')
            .is('assigned_coach_id', null)
            .order('created_at', { ascending: false })
        leads = fetchedLeads || []
    }

    // お知らせの取得（過去最新の100件）
    const { data: announcements } = await supabase
        .from('announcements')
        .select('id, title, content, published_at')
        .order('published_at', { ascending: false })
        .limit(100)

    return (
        <GlobalSearch
            students={students || []}
            coaches={coaches}
            leads={leads}
            announcements={announcements || []}
            isAdmin={isAdmin}
        />
    )
}
