import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFreeBusy } from '@/lib/google-calendar';
import { startOfMonth, endOfMonth, parseISO, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const coachId = searchParams.get('coachId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!coachId || !year || !month) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    // 1. Calculate Date Range
    const startDate = startOfMonth(new Date(parseInt(year), parseInt(month) - 1));
    const endDate = endOfMonth(startDate);

    // 2. Fetch Coach's Google Token
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', coachId)
        .single();

    // 3. Fetch Open Schedules
    const { data: schedules, error } = await adminClient
        .from('lesson_schedules')
        .select('*')
        .eq('coach_id', coachId)
        .eq('status', 'open') // Only open slots
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString());

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let availableSchedules = schedules || [];

    // 4. Filter with Google Calendar if connected
    if (profile?.google_refresh_token) {
        const busySlots = await getFreeBusy(
            profile.google_refresh_token,
            startDate.toISOString(),
            endDate.toISOString()
        );

        if (busySlots && busySlots.length > 0) {
            availableSchedules = availableSchedules.filter(schedule => {
                const scheduleStart = parseISO(schedule.start_time);
                const scheduleEnd = parseISO(schedule.end_time);

                // Check overlap with any busy slot
                const hasOverlap = busySlots.some((busy: any) => {
                    const busyStart = parseISO(busy.start);
                    const busyEnd = parseISO(busy.end);

                    return areIntervalsOverlapping(
                        { start: scheduleStart, end: scheduleEnd },
                        { start: busyStart, end: busyEnd }
                    );
                });

                return !hasOverlap;
            });
        }
    }

    return NextResponse.json({ schedules: availableSchedules });
}
