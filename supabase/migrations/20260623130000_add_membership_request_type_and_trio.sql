-- membership_change_requests テーブルに申請タイプとTrio状態要求を追加
ALTER TABLE membership_change_requests 
ADD COLUMN IF NOT EXISTS request_type TEXT DEFAULT 'change_plan' CHECK (request_type IN ('change_plan', 'add_plan', 'cancel_plan')),
ADD COLUMN IF NOT EXISTS requested_is_trio BOOLEAN DEFAULT NULL;

COMMENT ON COLUMN membership_change_requests.request_type IS '申請のタイプ (change_plan: プラン変更, add_plan: プラン追加, cancel_plan: プラン解約)';
COMMENT ON COLUMN membership_change_requests.requested_is_trio IS 'Trio会員資格の追加(true)または削除(false)を申請する場合にセット';
