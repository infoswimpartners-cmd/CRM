-- announcementsテーブルのcreated_by外部キーをauth.usersからpublic.profilesへ張り替える
ALTER TABLE public.announcements 
DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;

ALTER TABLE public.announcements 
ADD CONSTRAINT announcements_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
