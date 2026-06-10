-- Google Chat Webhookマスタ管理テーブルを作成
CREATE TABLE IF NOT EXISTS public.google_chat_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_name VARCHAR(255) NOT NULL,
    webhook_url TEXT NOT NULL,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- announcementsテーブルに通知カラムを追加
ALTER TABLE public.announcements 
    ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS notify_gchat BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS gchat_webhook_id UUID REFERENCES public.google_chat_webhooks(id) ON DELETE SET NULL;

-- RLSの有効化
ALTER TABLE public.google_chat_webhooks ENABLE ROW LEVEL SECURITY;

-- 管理者のみフルアクセス可能とするポリシー
CREATE POLICY "Admin full access to chat webhooks" 
ON public.google_chat_webhooks 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- 一般ユーザー（コーチなど）もお知らせ公開時の連携のため、SELECTのみ許可
CREATE POLICY "Allow authenticated read chat webhooks"
ON public.google_chat_webhooks
FOR SELECT
TO authenticated
USING (true);
