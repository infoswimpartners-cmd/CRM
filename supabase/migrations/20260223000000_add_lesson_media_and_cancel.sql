-- ============================================================
-- レッスン メディア（動画・写真）テーブル
-- コスト節約設計：実ファイルはSupabase Storageに保存し、URLのみ管理
-- ============================================================

create table if not exists lesson_media (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now() not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  coach_id uuid references profiles(id) on delete set null,
  media_type text not null check (media_type in ('video', 'image', 'youtube')),
  -- ストレージキー (Supabase Storage) または YouTube URL
  storage_path text,
  -- YouTube埋め込み用の動画ID（YouTube限定公開リンク代替案）
  youtube_video_id text,
  -- 表示順
  display_order integer default 0,
  -- コーチが付けるキャプション
  caption text,
  -- ファイルサイズ（MB単位、コスト管理用）
  file_size_mb decimal(8, 2)
);

-- RLS有効化
alter table lesson_media enable row level security;

-- 生徒は自分のレッスンのメディアを閲覧可能
create policy "Students can view media for their lessons"
  on lesson_media for select
  using (
    exists (
      select 1 from lessons l
      join students s on s.id = l.student_id
      where l.id = lesson_media.lesson_id
        and (s.auth_user_id = auth.uid() or s.line_user_id = auth.uid()::text)
    )
  );

-- コーチは自分が担当するレッスンのメディアを操作可能
create policy "Coaches can insert media for their lessons"
  on lesson_media for insert
  with check (
    exists (
      select 1 from lessons l
      where l.id = lesson_media.lesson_id
        and l.coach_id = auth.uid()
    )
  );

create policy "Coaches can update media for their lessons"
  on lesson_media for update
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Coaches can delete media for their lessons"
  on lesson_media for delete
  using (
    coach_id = auth.uid()
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 管理者はすべてのメディアを閲覧・操作可能
create policy "Admins can manage all lesson media"
  on lesson_media for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================
-- lessonsテーブルへキャンセル関連フィールドを追加
-- ============================================================

-- キャンセル実行日時
alter table lessons add column if not exists cancelled_at timestamp with time zone;

-- キャンセルペナルティフラグ
-- true = キャンセル料発生（前日12時以降のキャンセル）
-- false = キャンセル料なし（前日12時以前）
alter table lessons add column if not exists cancel_penalty boolean default false;

-- キャンセルメモ（理由など）
alter table lessons add column if not exists cancel_note text;

-- ============================================================
-- キャンセル可能なレッスン一覧を取得するRPC（会員用）
-- lesson_schedulesがない場合はlessonsを直接使用
-- ============================================================
create or replace function get_upcoming_lessons_for_student(p_student_id uuid)
returns table (
  id uuid,
  lesson_date timestamp with time zone,
  location text,
  status text,
  coach_name text,
  is_penalty_cancellation boolean,
  can_cancel boolean
)
language plpgsql
security definer
as $$
declare
  v_deadline timestamp with time zone;
begin
  return query
  select
    l.id,
    l.lesson_date,
    l.location,
    l.status,
    coalesce(p.full_name, '担当なし') as coach_name,
    -- 前日12:00を超えているかチェック
    (now() >= (date_trunc('day', l.lesson_date) - interval '1 day' + interval '12 hours')) as is_penalty_cancellation,
    -- キャンセル可能か（まだキャンセルされておらず、当日以降のレッスン）
    (l.status = 'scheduled' and l.lesson_date > now()) as can_cancel
  from lessons l
  left join profiles p on p.id = l.coach_id
  where l.student_id = p_student_id
    and l.lesson_date >= now()
    and l.status != 'cancelled'
  order by l.lesson_date asc;
end;
$$;

-- 権限付与
grant select on lesson_media to authenticated;
grant insert, update, delete on lesson_media to authenticated;
grant execute on function get_upcoming_lessons_for_student(uuid) to authenticated;
