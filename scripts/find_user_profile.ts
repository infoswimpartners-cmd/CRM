
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkProfile() {
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error fetching auth users:', userError);
        return;
    }

    // Find user by name in profiles (assuming name column exists) or search via auth (email?) if possible
    // Profiles usually has first_name / last_name or similar

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
    // Try matching name if column exists. I will just dump all profiles and filter in JS if needed
    // Assuming 'first_name' and 'last_name' or 'full_name' or just 'name'

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log('--- ALL PROFILES ---');
    profiles.forEach(p => {
        console.log(`ID: ${p.id}, Name: ${p.last_name} ${p.first_name}, Role: ${p.role}, Override: ${p.override_coach_rank}, Email: ${p.email}`);
    });

    // Also check if I can just list all profiles with name columns
    const fullProfiles = profiles.map(p => ({
        id: p.id,
        name: `${p.last_name} ${p.first_name}`,
        role: p.role,
        override: p.override_coach_rank
    }));

    // Find "新吉 航大"
    const target = fullProfiles.find(p => p.name.replace(/\s/g, '') === '新吉航大');
    if (target) {
        console.log('\n--- TARGET USER FOUND ---');
        console.log(target);
    } else {
        console.log('\n--- TARGET USER NOT FOUND BY EXACT NAME ---');
        console.log('Listing all potential matches:');
        console.log(fullProfiles.filter(p => p.name.includes('新吉') || p.name.includes('航大')));
    }

}

checkProfile();
