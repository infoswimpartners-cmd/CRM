-- 施設管理マスタ（facilities）の拡張：可変の施設利用料および精算方式（報酬込 vs 立替経費精算）
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS facility_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_payment_type text NOT NULL DEFAULT 'reward';

-- 既存の施設利用料適用あり（is_facility_fee_applied = true）の施設には 1500 を設定
UPDATE public.facilities
SET facility_fee = 1500
WHERE is_facility_fee_applied = true AND facility_fee = 0;

-- レッスン記録（lessons）の拡張：施設利用料（請求用）および立替経費精算額（源泉対象外）
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS facility_fee integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expense_reimbursement integer NOT NULL DEFAULT 0;
