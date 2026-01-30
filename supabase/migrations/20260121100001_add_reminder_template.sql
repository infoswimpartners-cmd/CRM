
-- Insert Lesson Reminder Template
INSERT INTO email_templates (key, subject, body, variables, description)
VALUES 
(
    'lesson_reminder',
    '【Swim Partners】明日のレッスン予約のリマインド',
    '{{name}} 様\n\nいつもSwim Partnersをご利用いただきありがとうございます。\n\n明日 {{date}} {{time}}より、{{coach_name}}とのレッスン予約がございます。\n\n当日はお気をつけてお越しください。\nお待ちしております。\n\nSwim Partners',
    ARRAY['{{name}}', '{{date}}', '{{time}}', '{{coach_name}}'],
    'レッスンの前日に自動送信されるリマインドメール'
)
ON CONFLICT (key) DO NOTHING;
