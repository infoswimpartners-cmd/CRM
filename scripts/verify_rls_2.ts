
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const coachId = 'dd83f35d-8946-414c-ad97-7436a3be9065'; // テスト新吉
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_students_for_coach_public', { p_coach_id: coachId });
    console.log('RPC Results for テスト新吉:', rpcData);
    if (rpcError) console.error('RPC Error:', rpcError);

    // Also check students table directly
    const { data: direct, error: directError } = await supabase.from('students').select('*').eq('coach_id', coachId);
    console.log('Direct Table Results for テスト新吉:', direct);
    if (directError) console.error('Direct Error:', directError);
}
check();
