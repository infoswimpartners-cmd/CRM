const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching membership types:', error);
    } else {
        console.log('Membership Types schema:', Object.keys(data[0] || {}));
    }
}

run();
