import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
    // 1. スロット一覧を取得
    const { data: slots, error } = await supabase.from('trio_slots').select('*');
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${slots.length} slots.`);

    for (const slot of slots) {
        // 2. 実際のエントリー数をカウント
        const { count, error: countError } = await supabase
            .from('trio_entries')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id);

        if (countError) {
            console.error(`Error counting entries for slot ${slot.id}:`, countError);
            continue;
        }

        const actualCount = count || 0;

        // 3. 不一致がある場合に更新
        if (actualCount !== slot.reserved_count) {
            console.log(`Slot ${slot.id} (${slot.start_at}): DB count ${slot.reserved_count} -> Actual count ${actualCount}`);
            
            let newStatus = 'entry';
            if (actualCount === 1) newStatus = 'matching';
            else if (actualCount >= 2) newStatus = 'confirmed';
            
            const { error: updateError } = await supabase
                .from('trio_slots')
                .update({ 
                    reserved_count: actualCount,
                    status: newStatus
                })
                .eq('id', slot.id);

            if (updateError) {
                console.error(`Error updating slot ${slot.id}:`, updateError);
            } else {
                console.log(`Successfully synced slot ${slot.id}`);
            }
        }
    }
}

sync();
