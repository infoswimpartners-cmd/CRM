export interface StudentLeaveSetting {
  student_id: string;
  start_year_month: string;      // 例: "2026-11"
  end_year_month: string;        // 例: "2027-04"
  start_date: string;            // 例: "2026-11-01"
  end_date: string;              // 例: "2027-04-30"
  resume_year_month: string;     // 例: "2027-05"
  resume_date: string;           // 例: "2027-05-01"
  leave_months: number;          // 1〜12ヶ月
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  reason?: string;
  stripe_subscription_paused?: boolean;
  confirmation_sent_at?: string | null;  // 休会受付案内の送信日時
  resume_reminder_sent_at?: string | null;// 再開案内の送信日時
  created_at: string;
  updated_at: string;
}

export interface SaveStudentLeaveParams {
  startYearMonth: string; // YYYY-MM
  endYearMonth: string;   // YYYY-MM
  reason?: string;
  sendConfirmation?: boolean; // 保存時に休会受付案内を即時送信するかどうか
}
