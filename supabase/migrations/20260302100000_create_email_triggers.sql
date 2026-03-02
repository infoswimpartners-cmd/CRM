CREATE TABLE public.email_triggers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_triggers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage email triggers" ON public.email_triggers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );

-- Insert initial events
INSERT INTO public.email_triggers (id, name, description) VALUES
('payment_success', '月額の自動決済が完了した時', '領収書代わりとなり、毎月の安心感を与えます。'),
('payment_failed', '決済が失敗（エラー）した時', '未回収を防ぐため。カード更新等の案内を即座に送ります。'),
('trial_lesson_reserved', '体験レッスンが予約された時', '予約確定通知。場所や持ち物の案内を自動化し、当日欠席を防ぎます。'),
('inquiry_received', '問い合わせを受信した時', '「受付完了」の即レスにより、他スクールへの流出を防ぎます。'),
('enrollment_completed', '（新規の）本入会手続きが完了した時', '歓迎のメッセージと共に、今後の流れ（初日案内）を伝えます。'),
('lesson_report_sent', 'コーチがレッスン報告を送信した時', '指導のフィードバック。保護者の満足度を飛躍的に高めます。'),
('trial_lesson_followup', '体験レッスン終了後', '熱が冷める前に本入会フォームへ誘導。成約率に直結します。'),
('trial_lesson_reminder', '体験レッスンの前日リマインド', 'うっかり忘れによる当日キャンセルを防止します。'),
('absence_cancelled', '欠席・キャンセルが登録された時', '振替レッスンの案内を自動化し、消化率を高めます。');
