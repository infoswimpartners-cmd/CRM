-- メール承認フローを完全無効化（すべてのテンプレートで承認不要にする）
UPDATE public.email_templates 
SET is_approval_required = false 
WHERE is_approval_required = true;
