'use server'

import { createClient } from '@/lib/supabase/server'

export async function getStudentMemos(studentId: string) {
    const supabase = await createClient()

    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
            id,
            lesson_date,
            menu_description,
            profiles (
                full_name
            )
        `)
        .eq('student_id', studentId)
        .order('lesson_date', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching student memos:', error)
        return { success: false, error: error.message }
    }

    return { success: true, data: lessons }
}
