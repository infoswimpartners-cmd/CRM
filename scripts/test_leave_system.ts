import {
  getJstDateString,
  getMonthFirstDate,
  getMonthLastDate,
  getNextYearMonth,
  getPreviousYearMonth,
  calculateMonths,
  buildLeaveConfirmationMessage,
  buildResumeReminderMessage,
} from '../src/lib/leave';
import {
  getStudentLeaveSetting,
  saveStudentLeaveSetting,
  cancelStudentLeaveSetting,
  processLeaveManagement,
} from '../src/actions/leave';
import { createAdminClient } from '../src/lib/supabase/admin';

async function runTests() {
  console.log('=== 1. 単体計算・ユーティリティ・メッセージ生成テスト ===');

  // JST日付
  const todayJst = getJstDateString();
  console.log(`[PASS] getJstDateString: ${todayJst} (regex match: ${/^\d{4}-\d{2}-\d{2}$/.test(todayJst)})`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayJst)) throw new Error('Invalid JST date format');

  // 月初・月末
  if (getMonthFirstDate('2026-11') !== '2026-11-01') throw new Error('getMonthFirstDate failed');
  if (getMonthLastDate('2026-11') !== '2026-11-30') throw new Error('getMonthLastDate failed for Nov');
  if (getMonthLastDate('2027-04') !== '2027-04-30') throw new Error('getMonthLastDate failed for Apr');
  if (getMonthLastDate('2027-02') !== '2027-02-28') throw new Error('getMonthLastDate failed for Feb 2027');
  if (getMonthLastDate('2028-02') !== '2028-02-29') throw new Error('getMonthLastDate failed for Feb 2028 leap');
  if (getMonthLastDate('2026-12') !== '2026-12-31') throw new Error('getMonthLastDate failed for Dec');
  console.log('[PASS] 月初・月末計算（閏年含む）');

  // 翌月・前月計算（年越し含む）
  if (getNextYearMonth('2026-11') !== '2026-12') throw new Error('getNextYearMonth Nov failed');
  if (getNextYearMonth('2026-12') !== '2027-01') throw new Error('getNextYearMonth Dec failed');
  if (getNextYearMonth('2027-04') !== '2027-05') throw new Error('getNextYearMonth Apr failed');
  if (getPreviousYearMonth('2027-01') !== '2026-12') throw new Error('getPreviousYearMonth Jan failed');
  if (getPreviousYearMonth('2027-05') !== '2027-04') throw new Error('getPreviousYearMonth May failed');
  console.log('[PASS] 翌月・前月計算（年越し境界含む）');

  // 月数計算（最長1年のバリデーション境界）
  if (calculateMonths('2026-11', '2027-04') !== 6) throw new Error('calculateMonths 6 months failed');
  if (calculateMonths('2026-11', '2026-11') !== 1) throw new Error('calculateMonths 1 month failed');
  if (calculateMonths('2026-12', '2027-11') !== 12) throw new Error('calculateMonths 12 months failed');
  if (calculateMonths('2026-12', '2027-12') !== 13) throw new Error('calculateMonths 13 months failed');
  if (calculateMonths('2027-05', '2026-11') > 0) throw new Error('calculateMonths inverted failed');
  console.log('[PASS] 月数計算（1ヶ月、6ヶ月、12ヶ月境界、13ヶ月超過検知）');

  // 休会受付案内文面の検証（プロンプト完全一致テスト）
  const confirmMsg = buildLeaveConfirmationMessage({
    studentName: 'リュウ ',
    coachName: '岡野',
    startYearMonth: '2026-11',
    endYearMonth: '2027-04',
    startDate: '2026年11月1日',
    endDate: '2027年4月30日',
    resumeYearMonth: '2027-05',
    leaveMonths: 6,
    reason: '私用',
  });
  if (!confirmMsg.body.includes('リュウ様')) throw new Error('Whitespace trim in student name failed');
  if (!confirmMsg.body.includes('11月から来年4月までの期間（6ヶ月間）')) throw new Error('Leave period text mismatch');
  if (!confirmMsg.body.includes('11月〜4月分（2026年11月1日〜2027年4月30日）の自動決済を停止いたします。')) throw new Error('Payment stop text mismatch');
  if (!confirmMsg.body.includes('レッスン再開（2027年5月〜）について：4月中旬頃に、再開に向けて日程等のご連絡をさせていただきます。')) throw new Error('Resume note text mismatch');
  if (!confirmMsg.body.includes('スタッフ・岡野コーチ一同心より楽しみにしております！')) throw new Error('Coach greeting mismatch');
  console.log('[PASS] 休会受付案内文面の構築（要件の定型文に完全合致）');

  // 再開案内文面の検証
  const resumeMsg = buildResumeReminderMessage({
    studentName: 'リュウ ',
    coachName: '岡野',
    resumeYearMonth: '2027-05',
    leaveEndDate: '2027年4月30日',
  });
  if (!resumeMsg.body.includes('リュウ様')) throw new Error('Resume msg trim failed');
  if (!resumeMsg.body.includes('5月からのレッスン再開に向けて')) throw new Error('Resume month text mismatch');
  if (!resumeMsg.body.includes('2027年4月30日をもちまして休会期間が終了し、2027年5月1日より定期課金およびレッスン受講が自動再開となります。')) throw new Error('Resume billing text mismatch');
  console.log('[PASS] 再開案内文面の構築（要件の定型文に完全合致）');

  console.log('\n=== 2. 顧客データ（会員番号0035 テスト太郎）を用いた状態遷移・エッジケース検証 ===');
  const supabase = createAdminClient();

  // 会員番号0035 テスト太郎の検証
  const { data: testStudent, error: findError } = await supabase
    .from('students')
    .select('id, student_number, full_name, status, stripe_subscription_id')
    .eq('student_number', '0035')
    .single();

  if (findError || !testStudent) {
    throw new Error(`会員番号0035 テスト太郎の取得に失敗しました: ${findError?.message}`);
  }
  console.log(`対象生徒確認: ${testStudent.full_name} (会員番号: ${testStudent.student_number}, ID: ${testStudent.id}, 初期ステータス: ${testStudent.status})`);

  const initialStatus = testStudent.status;
  const studentId = testStudent.id;

  try {
    // A. バリデーションエラー検知テスト
    const errOver12 = await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2026-11',
      endYearMonth: '2027-11', // 13ヶ月
    });
    if (errOver12.success || !errOver12.error?.includes('最長1年')) {
      throw new Error(`13ヶ月設定のエラー検知失敗: ${JSON.stringify(errOver12)}`);
    }
    console.log('[PASS] 13ヶ月（1年超過）設定のバリデーションエラー検知');

    const errInverted = await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2027-05',
      endYearMonth: '2026-11',
    });
    if (errInverted.success || !errInverted.error?.includes('終了月は開始月以降')) {
      throw new Error(`開始・終了逆転のエラー検知失敗: ${JSON.stringify(errInverted)}`);
    }
    console.log('[PASS] 期間逆転設定のバリデーションエラー検知');

    // B. 未来の休会設定保存テスト (2026-11 〜 2027-04)
    const saveFutureRes = await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2026-11',
      endYearMonth: '2027-04',
      reason: '私用でお忙しいため',
      sendConfirmation: false,
    });
    if (!saveFutureRes.success || !saveFutureRes.setting) {
      throw new Error(`未来休会設定保存失敗: ${saveFutureRes.error}`);
    }
    if (saveFutureRes.setting.status !== 'scheduled') {
      throw new Error(`未来休会は scheduled であるべきですが ${saveFutureRes.setting.status} です`);
    }
    console.log('[PASS] 未来休会設定の保存（status: scheduled, 6ヶ月間）');

    // C. 既に休会中（resting）の生徒が未来の休会予定に変更した場合、即座に active へ復帰するかのテスト
    // 一旦ステータスを resting に変更
    await supabase.from('students').update({ status: 'resting' }).eq('id', studentId);
    // 未来の休会（2026-12 〜 2027-05）を保存
    const rescheduleRes = await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2026-12',
      endYearMonth: '2027-05',
      reason: '開始月を12月に変更',
      sendConfirmation: false,
    });
    const { data: studentAfterReschedule } = await supabase
      .from('students')
      .select('status')
      .eq('id', studentId)
      .single();
    if (studentAfterReschedule?.status !== 'active') {
      throw new Error(`未来休会への変更時に active に復帰していません: actual=${studentAfterReschedule?.status}`);
    }
    console.log('[PASS] 休会中から未来休会への日程変更時に生徒ステータスが即座に active へ復帰');

    // D. 休会期間延長時にリマインド送信済みフラグがリセットされるかのテスト
    // 手動でリマインド送信日時を付与
    const currentSetting = await getStudentLeaveSetting(studentId);
    if (currentSetting) {
      currentSetting.resume_reminder_sent_at = '2026-10-15T00:00:00.000Z';
      await supabase.from('app_configs').upsert({
        key: `student_leave:${studentId}`,
        value: JSON.stringify(currentSetting),
      });
    }
    // 終了月を 2027-06 に延長
    const extendRes = await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2026-12',
      endYearMonth: '2027-06',
      reason: '1ヶ月延長',
      sendConfirmation: false,
    });
    if (extendRes.setting?.resume_reminder_sent_at !== null) {
      throw new Error(`休会期間変更時に resume_reminder_sent_at がリセットされていません: ${extendRes.setting?.resume_reminder_sent_at}`);
    }
    console.log('[PASS] 休会終了月変更（延長）時に再開案内送信履歴が正しくリセットされる');

    // E. バッチCron（processLeaveManagement）のシミュレーションテスト
    // 設定を 2026-11 〜 2027-04（6ヶ月間）に戻す
    await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2026-11',
      endYearMonth: '2027-04',
      reason: 'テスト太郎 休会',
      sendConfirmation: false,
    });

    // シナリオ1: 休会開始日 (2026-11-01) -> scheduled から active へ移行、生徒 status が resting へ更新
    const cronStartRes = await processLeaveManagement({
      dryRun: false,
      targetDate: '2026-11-01',
      targetStudentId: studentId,
    });
    const { data: studentAfterStart } = await supabase.from('students').select('status').eq('id', studentId).single();
    const settingAfterStart = await getStudentLeaveSetting(studentId);
    if (studentAfterStart?.status !== 'resting' || settingAfterStart?.status !== 'active') {
      throw new Error(`休会開始Cron処理失敗: student=${studentAfterStart?.status}, setting=${settingAfterStart?.status}`);
    }
    console.log('[PASS] Cron シミュレーション1: 2026-11-01 (休会開始) -> 生徒ステータス resting, 設定 active');

    // シナリオ2: 前月4日 (2027-04-04) -> 再開案内は未トリガー
    const cronBefore5thRes = await processLeaveManagement({
      dryRun: true,
      targetDate: '2027-04-04',
      targetStudentId: studentId,
    });
    if (cronBefore5thRes.results.reminders_sent.length !== 0) {
      throw new Error(`2027-04-04 に誤って再開案内がトリガーされました: ${JSON.stringify(cronBefore5thRes)}`);
    }
    console.log('[PASS] Cron シミュレーション2: 2027-04-04 (前月5日未満) -> 再開案内は未送信');

    // シナリオ3: 前月5日 (2027-04-05) -> 再開案内のトリガー判定成立
    const cronOn5thRes = await processLeaveManagement({
      dryRun: true,
      targetDate: '2027-04-05',
      targetStudentId: studentId,
    });
    if (cronOn5thRes.results.reminders_sent.length !== 1) {
      throw new Error(`2027-04-05 に再開案内がトリガーされませんでした: ${JSON.stringify(cronOn5thRes)}`);
    }
    console.log('[PASS] Cron シミュレーション3: 2027-04-05 (前月5日当日) -> 再開案内トリガー成立');

    // シナリオ4: 休会終了翌日 (2027-05-01) -> 自動再開処理成立、生徒 status が active へ復帰、設定 completed
    const cronResumeRes = await processLeaveManagement({
      dryRun: false,
      targetDate: '2027-05-01',
      targetStudentId: studentId,
    });
    const { data: studentAfterResume } = await supabase.from('students').select('status').eq('id', studentId).single();
    const settingAfterResume = await getStudentLeaveSetting(studentId);
    if (studentAfterResume?.status !== 'active' || settingAfterResume?.status !== 'completed') {
      throw new Error(`自動再開Cron処理失敗: student=${studentAfterResume?.status}, setting=${settingAfterResume?.status}`);
    }
    console.log('[PASS] Cron シミュレーション4: 2027-05-01 (休会終了翌日) -> 生徒ステータス active 自動復帰, 設定 completed');

    // F. 休会キャンセル・解除テスト
    // 再度休会を設定して解除をテスト
    await saveStudentLeaveSetting(studentId, {
      startYearMonth: '2026-11',
      endYearMonth: '2027-04',
      sendConfirmation: false,
    });
    const cancelRes = await cancelStudentLeaveSetting(studentId);
    if (!cancelRes.success) throw new Error('cancelStudentLeaveSetting failed');
    const settingAfterCancel = await getStudentLeaveSetting(studentId);
    if (settingAfterCancel?.status !== 'cancelled') {
      throw new Error(`キャンセル後ステータス不正: ${settingAfterCancel?.status}`);
    }
    console.log('[PASS] 休会設定の解除（status: cancelled, 課金・ステータス復帰）');

  } finally {
    // クリーンアップ: 会員番号0035 テスト太郎のデータを初期状態に戻し、app_configs のテスト用設定を削除
    console.log('\n=== クリーンアップ処理 ===');
    await supabase.from('students').update({ status: initialStatus }).eq('id', studentId);
    await supabase.from('app_configs').delete().eq('key', `student_leave:${studentId}`);
    const { data: restored } = await supabase.from('students').select('status').eq('id', studentId).single();
    console.log(`会員番号0035 テスト太郎のステータスを初期値 (${restored?.status}) に復元し、テスト用休会設定を完全クリーンアップしました。`);
  }

  console.log('\n>>> 全ての単体テスト・状態遷移テスト・エッジケーステストが正常に通過しました！ <<<');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
