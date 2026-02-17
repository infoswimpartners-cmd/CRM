
INSERT INTO email_templates (key, subject, body)
VALUES (
  'reception_completed',
  '【Swim Partners】お申し込みを受け付けました',
  '{{name}} 様\n\nSwim Partnersへのお申し込みありがとうございます。\n以下の内容で受付いたしました。\n\n担当者より改めてご連絡させていただきますので、\n今しばらくお待ちください。\n\n--------------------------------------------------\nSwim Partners'
)
ON CONFLICT (key) DO NOTHING;
