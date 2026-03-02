-- 体験申し込みフォーム送信時のトリガーを追加
INSERT INTO public.email_triggers (id, name, description) VALUES
('trial_form_submitted', '体験申し込み時（フォーム送信）', 'ウェブサイトの体験申し込みフォームが送信された時。申し込み受付の自動返信やスタッフへの通知として活用できます。');
