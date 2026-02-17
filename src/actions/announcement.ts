'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailService } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export type CreateAnnouncementInput = {
    title: string
    content: string
    priority: 'normal' | 'high'
}

export async function createAnnouncementAction(data: CreateAnnouncementInput) {
    const supabase = await createClient()

    // 1. Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { success: false, error: 'Forbidden: Admin only' }
    }

    // 2. Insert Announcement
    const { data: announcement, error: insertError } = await supabase
        .from('announcements')
        .insert({
            title: data.title,
            content: data.content,
            priority: data.priority,
            created_by: user.id,
            published_at: new Date().toISOString(),
        })
        .select()
        .single()

    if (insertError) {
        console.error('Error inserting announcement:', insertError)
        return { success: false, error: 'Failed to create announcement' }
    }

    // Revalidate paths immediately after insertion
    revalidatePath('/admin/announcements')
    revalidatePath('/coach') // For the widget

    // 3. Fetch Coaches to Email (Fire and Forget style if possible, but Vercel/Next might kill it. 
    // We will await it but use Promise.allSettled or just catch error strictly to not block UI return if email fails).

    // We wrap email sending in a try-catch that does NOT throw, so the function returns success even if email fails (with a warning logs).
    try {
        const supabaseAdmin = createAdminClient()

        // Get Coach IDs
        const { data: coachesData, error: coachError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('role', 'coach')

        if (!coachError && coachesData) {
            const coachIds = new Set(coachesData.map(c => c.id))

            // Loop for users
            let allUsers: any[] = []
            let page = 1
            let keepGoing = true

            while (keepGoing) {
                const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
                    page: page,
                    perPage: 1000
                })

                if (usersError || !users || users.length === 0) {
                    keepGoing = false
                } else {
                    allUsers = [...allUsers, ...users]
                    if (users.length < 1000) keepGoing = false
                    page++
                }
            }

            const coachEmails = allUsers
                .filter(u => coachIds.has(u.id) && u.email)
                .map(u => u.email as string)

            // 4. Send Emails (BCC)
            if (coachEmails.length > 0) {
                const subject = `【重要】事務局からのお知らせ: ${data.title}`
                const text = `
コーチ各位

事務局より新しいお知らせがあります。

■${data.title}
${data.content}

━━━━━━━━━━━━━━━━
ログインして確認: ${process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com'}/coach
━━━━━━━━━━━━━━━━
`
                await emailService.sendEmail({
                    to: process.env.SMTP_USER || 'admin@example.com',
                    bcc: coachEmails.join(', '),
                    subject,
                    text
                })
            }
        }
    } catch (e) {
        console.error('Email sending failed (background):', e)
        // Do not return false, as announcement is created.
    }

    return { success: true, announcement }
}
