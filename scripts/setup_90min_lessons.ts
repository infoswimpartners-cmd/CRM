
import { createAdminClient } from '@/lib/supabase/admin'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function setup90Min() {
    const supabase = createAdminClient()

    // 1. Create Lesson Masters
    const lessons = [
        { name: '月2回（90分）', unit_price: 12700 },
        { name: '月4回（90分）', unit_price: 12500 }
    ]

    const createdIds: Record<string, string> = {}

    for (const l of lessons) {
        // Check if exists
        const { data: existing } = await supabase.from('lesson_masters').select('id').eq('name', l.name).single()

        if (existing) {
            console.log(`Lesson ${l.name} already exists:`, existing.id)
            createdIds[l.name] = existing.id
        } else {
            const { data: newL, error } = await supabase.from('lesson_masters').insert(l).select().single()
            if (error) {
                console.error('Create Error:', error)
            } else {
                console.log(`Created ${l.name}:`, newL.id)
                createdIds[l.name] = newL.id
            }
        }
    }

    // 2. Link to Memberships
    // Get Membership IDs
    const { data: memberships } = await supabase.from('membership_types').select('id, name')
    if (!memberships) return

    const m2_90 = memberships.find(m => m.name === '月2回（90分）')
    const m4_90 = memberships.find(m => m.name === '月4回（90分）')

    // Link Month 2
    if (m2_90 && createdIds['月2回（90分）']) {
        const lessonId = createdIds['月2回（90分）']
        // Update Default
        await supabase.from('membership_types').update({ default_lesson_master_id: lessonId }).eq('id', m2_90.id)
        // Insert Link (ignore conflict)
        await supabase.from('membership_type_lessons').upsert({ membership_type_id: m2_90.id, lesson_master_id: lessonId }, { onConflict: 'membership_type_id, lesson_master_id' })
        console.log('Linked Month 2 (90min)')
    }

    // Link Month 4
    if (m4_90 && createdIds['月4回（90分）']) {
        const lessonId = createdIds['月4回（90分）']
        // Update Default
        await supabase.from('membership_types').update({ default_lesson_master_id: lessonId }).eq('id', m4_90.id)
        // Insert Link
        await supabase.from('membership_type_lessons').upsert({ membership_type_id: m4_90.id, lesson_master_id: lessonId }, { onConflict: 'membership_type_id, lesson_master_id' })
        console.log('Linked Month 4 (90min)')
    }
}

setup90Min()
