import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { subDays } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const dryRun = searchParams.get('dry_run') === 'true'

    // Verify CRON_SECRET if configured in env
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const supabase = createAdminClient()
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

    try {
        const results = {
            deletedAssignedLeadsCount: 0,
            deletedUnassignedLeadsCount: 0,
            errors: [] as string[]
        }

        if (dryRun) {
            // Dry run: query what would be deleted
            const { data: assignedLeads } = await supabase
                .from('leads')
                .select('id, name, assigned_at')
                .not('assigned_coach_id', 'is', null)
                .lte('assigned_at', thirtyDaysAgo)

            const { data: unassignedLeads } = await supabase
                .from('leads')
                .select('id, name, created_at')
                .is('assigned_coach_id', null)
                .lte('created_at', thirtyDaysAgo)

            return NextResponse.json({
                success: true,
                dry_run: true,
                target_date_threshold: thirtyDaysAgo,
                would_delete_assigned: assignedLeads || [],
                would_delete_unassigned: unassignedLeads || []
            })
        }

        // 1. アサイン完了から30日以上経過したリードの削除
        const { count: count1, error: error1 } = await supabase
            .from('leads')
            .delete({ count: 'exact' })
            .not('assigned_coach_id', 'is', null)
            .lte('assigned_at', thirtyDaysAgo)

        if (error1) {
            console.error('Error deleting assigned leads:', error1)
            results.errors.push(`Assigned leads delete error: ${error1.message}`)
        } else {
            results.deletedAssignedLeadsCount = count1 || 0
        }

        // 2. アサインされずに放置されて作成から30日以上経過したリードの削除
        const { count: count2, error: error2 } = await supabase
            .from('leads')
            .delete({ count: 'exact' })
            .is('assigned_coach_id', null)
            .lte('created_at', thirtyDaysAgo)

        if (error2) {
            console.error('Error deleting unassigned leads:', error2)
            results.errors.push(`Unassigned leads delete error: ${error2.message}`)
        } else {
            results.deletedUnassignedLeadsCount = count2 || 0
        }

        return NextResponse.json({
            success: results.errors.length === 0,
            dry_run: false,
            target_date_threshold: thirtyDaysAgo,
            deleted_assigned_count: results.deletedAssignedLeadsCount,
            deleted_unassigned_count: results.deletedUnassignedLeadsCount,
            errors: results.errors
        })

    } catch (e: any) {
        console.error('Lead cleanup unexpected error:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
