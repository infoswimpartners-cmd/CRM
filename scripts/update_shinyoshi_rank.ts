
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateProfile() {
    const targetId = '7e37b1f0-955c-4c31-86f7-657bec2366fe'; // Shinyoshi Kodai
    console.log(`Updating profile for ${targetId}...`);

    const { data, error } = await supabase
        .from('profiles')
        .update({ override_coach_rank: 1.0 })
        .eq('id', targetId)
        .select();

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Update successful:', data);
    }

    // Also update the "Management" account just in case
    const adminId = 'bbdace0d-fd4f-4510-ad93-3e9366e9fe90';
    console.log(`Updating profile for ${adminId}...`);
    const { data: data2, error: error2 } = await supabase
        .from('profiles')
        .update({ override_coach_rank: 1.0 })
        .eq('id', adminId)
        .select();

    if (error2) {
        console.error('Error updating management profile:', error2);
    } else {
        console.log('Update successful:', data2);
    }

}

updateProfile();
