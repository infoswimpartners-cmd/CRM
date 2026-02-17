import { createClient } from "@/lib/supabase/server";
import { TodayScheduleList } from "./TodayScheduleList";

export async function TodayScheduleWidget({ coachId }: { coachId: string }) {
    const supabase = await createClient();

    // Get today's start and end properly in JST/Server time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: schedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id,
            start_time,
            end_time,
            location,
            lesson_master_id,
            students ( id, full_name )
        `)
        .eq('coach_id', coachId)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true });

    return <TodayScheduleList schedules={schedules || []} />;
}
