-- leads テーブルに顧客向け自動LINE通知の有無を制御するカラムを追加
ALTER TABLE public.leads ADD COLUMN send_customer_notification boolean DEFAULT true NOT NULL;
