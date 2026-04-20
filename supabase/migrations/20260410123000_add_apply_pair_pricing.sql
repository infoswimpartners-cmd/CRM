-- Add apply_pair_pricing to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS apply_pair_pricing boolean DEFAULT false;

COMMENT ON COLUMN students.apply_pair_pricing IS '受講料にペア単価（1.5倍相当）を適用するかどうかのフラグ';
