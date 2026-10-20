/**
 * 退会者向け：指定された再開時期（年月）に合わせたレッスン再開（復帰アプローチ）案内メッセージを構築
 */
export function buildWithdrawalResumeReminderMessage(params: {
  studentName: string;
  coachName?: string | null;
  resumeTargetMonth?: string | null; // 例: "2027-03", "2027-05" など
}): { subject: string; body: string } {
  const studentName = params.studentName.trim();
  const coachGreeting = params.coachName?.trim()
    ? `スタッフ・${params.coachName.trim()}コーチ一同`
    : 'スタッフ・コーチ一同';

  let timeText = '今後のレッスン再開';
  let seasonalGreeting = '水泳を気持ちよく再開するのにぴったりの時期となってまいりました。';

  if (params.resumeTargetMonth && /^\d{4}-\d{2}$/.test(params.resumeTargetMonth)) {
    const [y, m] = params.resumeTargetMonth.split('-');
    const yearNum = parseInt(y, 10);
    const monthNum = parseInt(m, 10);
    timeText = `${monthNum}月`;

    // 季節・月別の自然な挨拶文
    if (monthNum >= 3 && monthNum <= 5) {
      seasonalGreeting = '暖かくなってまいりましたので、水泳を気持ちよく再開するのにぴったりの季節となってまいりました。';
    } else if (monthNum >= 6 && monthNum <= 8) {
      seasonalGreeting = 'プールが心地よく、水泳を思いきり楽しめる最高の季節となってまいりました。';
    } else if (monthNum >= 9 && monthNum <= 11) {
      seasonalGreeting = '過ごしやすい気候となり、運動や水泳をマイペースに楽しむのにぴったりの季節となってまいりました。';
    } else {
      seasonalGreeting = '新たな目標に向けて、水泳のレッスンを再スタートするのに良い時期となってまいりました。';
    }
  }

  const subject = `【Swim Partners】${timeText}からのレッスン再開のご案内`;
  const body = `${studentName}様

いつもスイムパートナーズをご利用いただき、誠にありがとうございます。

以前の退会お手続きの際にお伺いしておりましたご希望に合わせて、${timeText}からのレッスン再開に向けたご案内をお送りいたしました。

${seasonalGreeting}
もしレッスンの再開をご検討いただけるようでしたら、ご都合の良い日程やコーチのご希望など、本メッセージへのご返信、または公式LINEにてお気軽にお知らせください。

また${studentName}様と一緒にレッスンができることを、${coachGreeting}心より楽しみにお待ちしております！

ご不明な点やスケジュールのご相談などがございましたら、いつでもお気軽にご連絡ください。
どうぞよろしくお願いいたします。`;

  return { subject, body };
}
