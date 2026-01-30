
-- Create Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables TEXT[],
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Allow Admins to do everything
CREATE POLICY "Enable all access for admins" ON email_templates
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Seed Data (Upsert)
INSERT INTO email_templates (key, subject, body, variables, description)
VALUES 
(
    'inquiry_received',
    '【Swim Partners】お問い合わせありがとうございます',
    '{{name}} 様\n\nSwim Partnersへのお問い合わせ・体験申し込みありがとうございます。\n内容を確認の上、担当者より日程調整のご連絡をさせていただきます。\n\n今しばらくお待ちください。\n\n--------------------------------------------------\nSwim Partners\n--------------------------------------------------',
    ARRAY['{{name}}'],
    'フォーム送信直後にユーザーへ送られる自動返信メール'
),
(
    'trial_payment_request',
    '【Swim Partners】体験レッスンの日程確定と事前決済のお願い',
    '{{name}} 様\n\nSwim Partnersです。\n体験レッスンの日程が以下の通り確定いたしました。\n\n■ 体験レッスン日時\n{{lesson_date}}\n\nつきましては、下記URLより体験レッスン料（¥{{amount}}）の事前決済をお願いいたします。\nお支払いの完了を確認次第、予約確定となります。\n\n▼ お支払いリンク\n{{payment_link}}\n\n当日お会いできるのを楽しみにしております。',
    ARRAY['{{name}}', '{{lesson_date}}', '{{amount}}', '{{payment_link}}'],
    '管理者が体験日時を確定した際に送る決済依頼メール'
),
(
    'trial_confirmed',
    '【Swim Partners】体験レッスンのお支払いが完了しました',
    '{{name}} 様\n\nSwim Partnersです。\n体験レッスンのお支払いが確認できました。\n\nご予約が正式に確定いたしました。\n当日は以下の日時にお待ちしております。\n\n■ 日時\n{{lesson_date}}\n\n■ 場所\nご指定のプール（詳細は担当者よりご連絡いたします）\n\nよろしくお願いいたします。',
    ARRAY['{{name}}', '{{lesson_date}}'],
    '決済完了後に送られる予約確定メール'
),
(
    'enrollment_complete',
    '【Swim Partners】本入会手続きが完了しました',
    '{{name}} 様\n\nSwim Partnersへの本入会手続きが完了いたしました。\n以下のプランで登録されました。\n\n■ ご登録プラン\n{{plan_name}}\n\n■ ご利用開始日 (定期課金開始日)\n{{start_date}}\n※ 開始日までのレッスンは、別途「都度利用」として合算請求されます。\n\nこれから一緒に頑張りましょう！\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n--------------------------------------------------\nSwim Partners\n--------------------------------------------------',
    ARRAY['{{name}}', '{{plan_name}}', '{{start_date}}'],
    '本入会フォーム送信後に送られる完了メール'
)
ON CONFLICT (key) DO NOTHING;
