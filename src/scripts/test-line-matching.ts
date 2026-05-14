import { createAdminClient } from '../lib/supabase/admin';
import fs from 'fs';
import path from 'path';

// .env.local を手動で読み込む
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function testLineMatching() {
  const supabase = createAdminClient();
  const testTaroId = 'e0fcec0b-b5ae-47a9-ab50-632a206d8aff';
  const dummyId = 'f952f6cf-b0e6-4b6a-9167-5727e66055d3'; // 石田そうま (LINE連携なし)

  console.log('--- Simulation Start ---');

  // 1. テスト用スロット作成
  const { data: slot, error: slotError } = await supabase
    .from('trio_slots')
    .insert([{
      start_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間後
      end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      location: 'テスト施設(代官山)',
      status: 'entry',
      reserved_count: 0
    }])
    .select()
    .single();

  if (slotError) {
    console.error('Failed to create slot:', slotError);
    return;
  }
  console.log('Created test slot:', slot.id);

  // 2. 1人目のエントリー (ダミー)
  await supabase.from('trio_entries').insert([{ slot_id: slot.id, student_id: dummyId, payment_status: 'paid' }]);
  await supabase.from('trio_slots').update({ reserved_count: 1, status: 'matching' }).eq('id', slot.id);
  console.log('1st person entered.');

  // 3. 2人目のエントリー (テスト太郎) - ここでマッチング成立ロジックが走るはず
  // Server Actionを直接呼ぶのはセッションが必要なため、ロジックを模倣するか、Actionファイルをインポートして呼ぶ
  // ここでは通知ロジックを確認したいので、trio_matching.ts の中身を参考に実行
  
  console.log('Triggering matching logic for Test Taro...');
  
  // 実際のエントリー追加
  await supabase.from('trio_entries').insert([{ slot_id: slot.id, student_id: testTaroId, payment_status: 'paid' }]);
  
  // 状態更新
  const { count: actualCount } = await supabase
    .from('trio_entries')
    .select('*', { count: 'exact', head: true })
    .eq('slot_id', slot.id);

  const newCount = actualCount || 0;
  const newStatus = newCount >= 2 ? 'confirmed' : 'matching';
  
  await supabase.from('trio_slots').update({ status: newStatus, reserved_count: newCount }).eq('id', slot.id);
  console.log(`Slot status updated to: ${newStatus}, count: ${newCount}`);

  // 通知ロジックの実行 (trio_matching.ts から抜粋)
  if (newCount === 2) {
    const { data: participants } = await supabase
      .from('students')
      .select('full_name, line_user_id')
      .in('id', [testTaroId, dummyId]);

    if (participants) {
      const { lineService } = await import('../lib/line');
      const formattedDate = new Date(slot.start_at).toLocaleString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
      
      for (const p of participants) {
        if (p.line_user_id) {
          console.log(`Sending LINE to ${p.full_name} (${p.line_user_id})...`);
          const message = `【THE TRIO】マッチング成立のお知らせ\n\n${p.full_name}様、お待たせいたしました！\n以下のセッションのマッチングが成立し、開催が確定しました。\n\n日時：${formattedDate}\n場所：${slot.location}\n\n当日のご来場を心よりお待ちしております。`;
          await lineService.pushMessage(p.line_user_id, message);
          console.log('LINE sent successfully.');
        } else {
          console.log(`Skipping LINE for ${p.full_name} (No LINE ID).`);
        }
      }
    }
  }

  console.log('--- Simulation End ---');
  console.log(`Verify the LINE message on Test Taro's device.`);
  console.log(`Test Slot ID: ${slot.id}`);
}

testLineMatching();
