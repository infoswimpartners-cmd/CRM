-- membership_types テーブルへのカラム追加
alter table membership_types
add column if not exists pricing_group text null,
add column if not exists show_in_enroll boolean not null default true;

-- 既存データの show_in_enroll を全て true に設定（後で手動更新する前提）
update membership_types set show_in_enroll = true where show_in_enroll is false;

-- lesson_masters テーブルへのカラム追加
alter table lesson_masters
add column if not exists pricing_group text null,
add column if not exists show_in_enroll boolean not null default true;

-- 既存データの show_in_enroll を全て true に設定
update lesson_masters set show_in_enroll = true where show_in_enroll is false;

-- Supabase の RPC などを更新する必要がある場合はここに追記するが、今回はカラム追加のみでOK
