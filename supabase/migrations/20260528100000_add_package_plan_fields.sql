-- パッケージプランフラグ（true = 一括払いパッケージ / false = 月次継続プラン）
ALTER TABLE membership_types ADD COLUMN IF NOT EXISTS is_package boolean DEFAULT false;

-- 決済完了時に付与するチケット枚数（パッケージプランのみ使用）
ALTER TABLE membership_types ADD COLUMN IF NOT EXISTS ticket_count integer DEFAULT 0;
