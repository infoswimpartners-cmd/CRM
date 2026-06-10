-- profilesテーブルにbase_area（基本エリア）カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS base_area text;
