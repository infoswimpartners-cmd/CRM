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
        .select('id, full_name, avatar_url')
        .order('full_name')

    let coaches: any[] = []

    if (isAdmin) {
        const { data: fetchedCoaches } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('role', 'coach')
        coaches = fetchedCoaches || []
    }

    return (
        <GlobalSearch
            students={students || []}
            coaches={coaches}
            isAdmin={isAdmin}
        />
    )
}
