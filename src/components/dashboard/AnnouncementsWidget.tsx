import { createClient } from "@/lib/supabase/server";
import { AnnouncementsList } from "./AnnouncementsList";

export async function AnnouncementsWidget() {
    const supabase = await createClient();
    const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5); // Increased limit slightly

    // @ts-ignore - Ensure type compatibility or cast
    const safeAnnouncements = announcements?.map(a => ({
        ...a,
        priority: a.priority as 'normal' | 'high'
    })) || [];

    if (safeAnnouncements.length === 0) {
        return null;
    }

    return <AnnouncementsList announcements={safeAnnouncements} />;
}
