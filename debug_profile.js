
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log('Connecting to Supabase...');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        if (data.length > 0) {
            console.log('Available columns:', Object.keys(data[0]));
            // Now fetch all with known columns
            const { data: allProfiles } = await supabase.from('profiles').select('*');
            if (allProfiles) {
                allProfiles.forEach(p => {
                    console.log(JSON.stringify(p));
                });
            }
        } else {
            console.log('No profiles found.');
        }
    }
}

run();
