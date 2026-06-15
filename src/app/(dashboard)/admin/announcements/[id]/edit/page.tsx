import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import EditAnnouncementForm from "./EditForm";

export default async function EditAnnouncementPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: announcement, error } = await supabase
        .from("announcements")
        .select("id, title, content, priority")
        .eq("id", id)
        .single();

    if (error || !announcement) {
        notFound();
    }

    return <EditAnnouncementForm announcement={announcement as any} />;
}
