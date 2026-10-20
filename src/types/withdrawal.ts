export interface StudentWithdrawalSetting {
  student_id: string;
  withdrawal_date: string;          // 退会適用日 (YYYY-MM-DD)
  withdrawal_year_month: string;    // 退会年月 (YYYY-MM)
  reason?: string;                  // 退会理由（例: "寒くなってきたため一時退会、春頃に再開希望"）
  resume_target_month?: string;     // 再開案内希望年月 (YYYY-MM, 例: "2027-03")
  resume_reminder_sent_at?: string | null; // 再開案内リマインド送信日時
  status: 'scheduled' | 'active' | 'cancelled';   // 退会ステータス（scheduled: 退会予約中, active: 退会完了, cancelled: 復帰・取消）
  created_at: string;
  updated_at: string;
}

export interface SaveStudentWithdrawalParams {
  withdrawalDate: string;           // YYYY-MM-DD
  reason?: string;
  resumeTargetMonth?: string;       // YYYY-MM（任意。3月ごろなど）
  cancelStripe?: boolean;           // Stripeサブスクリプションを解約するか（デフォルトtrue）
}
