/**
 * 日本時間(JST)での「今日」のYYYY-MM-DD文字列を取得
 */
export function getJstDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replace(/\//g, '-');
}

/**
 * 指定年月の初日 (YYYY-MM-01)
 */
export function getMonthFirstDate(yearMonth: string): string {
  return `${yearMonth}-01`;
}

/**
 * 指定年月の末日 (YYYY-MM-DD)
 */
export function getMonthLastDate(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * 翌月のYYYY-MMを取得
 */
export function getNextYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (m === 12) {
    return `${y + 1}-01`;
  }
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * 前月のYYYY-MMを取得
 */
export function getPreviousYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (m === 1) {
    return `${y - 1}-12`;
  }
  return `${y}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * 2つの年月の間の月数を計算（両端を含む）
 * 例: 2026-11 〜 2027-04 = 6ヶ月
 */
export function calculateMonths(startYearMonth: string, endYearMonth: string): number {
  if (!/^\d{4}-\d{2}$/.test(startYearMonth) || !/^\d{4}-\d{2}$/.test(endYearMonth)) return 0;
  const [y1, m1] = startYearMonth.split('-').map(Number);
  const [y2, m2] = endYearMonth.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}

/**
 * 休会受付・開始案内メッセージ文面を構築
 * ユーザー指定の丁寧な定型文フォーマットに完全準拠
 */
export function buildLeaveConfirmationMessage(params: {
  studentName: string;
  coachName?: string | null;
  startYearMonth: string; // YYYY-MM
  endYearMonth: string;   // YYYY-MM
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  resumeYearMonth: string;// YYYY-MM
  leaveMonths: number;
  reason?: string | null;
}): { subject: string; body: string } {
  const studentName = params.studentName.trim();
  const coachGreeting = params.coachName?.trim() ? `スタッフ・${params.coachName.trim()}コーチ一同` : 'スタッフ・コーチ一同';

  const [startY, startM] = params.startYearMonth.split('-');
  const [endY, endM] = params.endYearMonth.split('-');
  const [resY, resM] = params.resumeYearMonth.split('-');

  const reminderM = parseInt(endM, 10);
  const isDifferentYear = startY !== endY;
  const periodText = isDifferentYear
    ? `${parseInt(startM, 10)}月から来年${parseInt(endM, 10)}月までの期間（${params.leaveMonths}ヶ月間）`
    : `${parseInt(startM, 10)}月から${parseInt(endM, 10)}月までの期間（${params.leaveMonths}ヶ月間）`;

  const reasonPhrase = params.reason?.trim() ? `${params.reason.trim()}でお忙しいかと存じますが、` : '私用でお忙しいかと存じますが、';

  const subject = `【Swim Partners】休会手続き完了のお知らせ（${parseInt(startM, 10)}月〜${parseInt(endM, 10)}月分）`;
  const body = `${studentName}様

いつもスイムパートナーズをご利用いただき、誠にありがとうございます。

休会のご希望につきまして、承知いたしました。
${periodText}、レッスンをお休みとし、定期課金を一時停止（休会処理）させていただきます。

休会期間中につきましては、以下の点をご確認いただけますと幸いです。

・定期課金の停止について：${parseInt(startM, 10)}月〜${parseInt(endM, 10)}月分（${params.startDate}〜${params.endDate}）の自動決済を停止いたします。
・レッスン再開（${resY}年${parseInt(resM, 10)}月〜）について：${reminderM}月中旬頃に、再開に向けて日程等のご連絡をさせていただきます。

${reasonPhrase}また${parseInt(resM, 10)}月に${studentName}様と一緒にレッスンができることを、${coachGreeting}心より楽しみにしております！

ご不明な点やご質問がございましたら、いつでもお気軽にご連絡ください。
どうぞよろしくお願いいたします。`;

  return { subject, body };
}

/**
 * 再開案内のメッセージ文面を構築
 */
export function buildResumeReminderMessage(params: {
  studentName: string;
  coachName?: string | null;
  resumeYearMonth: string; // YYYY-MM
  leaveEndDate: string;    // YYYY-MM-DD
}): { subject: string; body: string } {
  const studentName = params.studentName.trim();
  const coachGreeting = params.coachName?.trim() ? `スタッフ・${params.coachName.trim()}コーチ一同` : 'スタッフ・コーチ一同';
  const [resY, resM] = params.resumeYearMonth.split('-');

  const subject = `【Swim Partners】${parseInt(resM, 10)}月からのレッスン再開のご案内`;
  const body = `${studentName}様

いつもスイムパートナーズをご利用いただき、誠にありがとうございます。

休会期間中はいかがお過ごしでしょうか。
${resY}年${parseInt(resM, 10)}月からのレッスン再開に向けて、日程等のご連絡とご案内をさせていただきます。

・定期課金の再開について：${params.leaveEndDate}をもちまして休会期間が終了し、${resY}年${parseInt(resM, 10)}月1日より定期課金およびレッスン受講が自動再開となります。
・レッスン日程のご調整について：再開後のレッスン日程やご希望の日時がございましたら、本メッセージへのご返信、または公式LINEにてお気軽にお知らせください。

また${parseInt(resM, 10)}月に${studentName}様と一緒にレッスンができることを、${coachGreeting}心より楽しみにしております！

ご不明な点やスケジュールのご相談などがございましたら、いつでもお気軽にご連絡ください。
どうぞよろしくお願いいたします。`;

  return { subject, body };
}
