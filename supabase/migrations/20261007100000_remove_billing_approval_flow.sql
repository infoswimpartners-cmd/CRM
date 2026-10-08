-- 決済承認フローの撤廃および過去の承認履歴のクリーンアップ
-- 1. メール承認キューのクリーンアップ
DELETE FROM public.email_approvals;

-- 2. レッスン予約の承認待ち・承認済みステータスを次月請求（保留中）または支払待ちに一括移行
UPDATE public.lesson_schedules 
SET billing_status = 'ready_to_invoice' 
WHERE billing_status IN ('awaiting_approval', 'approved') AND is_overage = true;

UPDATE public.lesson_schedules 
SET billing_status = 'awaiting_payment' 
WHERE billing_status IN ('awaiting_approval', 'approved') AND is_overage = false;
