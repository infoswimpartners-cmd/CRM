-- 稼働可能枠テーブルの作成
CREATE TABLE IF NOT EXISTS coach_availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week text NOT NULL, -- '月', '火', '水', '木', '金', '土', '日'
  time_of_day text NOT NULL, -- '午前', '午後', '夕方', '終日'
  area text NOT NULL,        -- エリア名
  notes text,                -- 自由記入欄
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLSの有効化
ALTER TABLE coach_availabilities ENABLE ROW LEVEL SECURITY;

-- 管理者は全操作可能
CREATE POLICY "Admins can do everything on coach_availabilities" ON coach_availabilities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- コーチは自身の稼働枠を閲覧・追加・削除可能
CREATE POLICY "Coaches can manage their own availabilities" ON coach_availabilities
  FOR ALL USING (
    coach_id = auth.uid()
  );

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_coach_availabilities_coach_id ON coach_availabilities(coach_id);
