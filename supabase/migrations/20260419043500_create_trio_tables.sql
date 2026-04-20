-- 1. trio_users テーブル
CREATE TABLE IF NOT EXISTS public.trio_users (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    line_user_id text,
    status text NOT NULL DEFAULT 'waitlist' CHECK (status IN ('active', 'waitlist', 'banned')),
    membership_type text CHECK (membership_type IN ('weekday', 'allday')),
    ticket_balance integer NOT NULL DEFAULT 0,
    stripe_customer_id text,
    subscription_active boolean NOT NULL DEFAULT false
);

-- Unique 制約
ALTER TABLE public.trio_users ADD CONSTRAINT trio_users_line_user_id_key UNIQUE (line_user_id);

-- 更新トリガー
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.trio_users FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- 2. trio_slots テーブル
CREATE TABLE IF NOT EXISTS public.trio_slots (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    status text NOT NULL DEFAULT 'entry' CHECK (status IN ('entry', 'matching', 'confirmed', 'closed')),
    reserved_count integer NOT NULL DEFAULT 0 CHECK (reserved_count >= 0 AND reserved_count <= 3),
    is_facility_booked boolean NOT NULL DEFAULT false
);

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.trio_slots FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime('updated_at');

-- 3. trio_entries テーブル
CREATE TABLE IF NOT EXISTS public.trio_entries (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    slot_id uuid NOT NULL REFERENCES public.trio_slots(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.trio_users(id) ON DELETE CASCADE,
    payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    UNIQUE(slot_id, user_id)
);

-- RLS (Row Level Security) の設定
ALTER TABLE public.trio_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trio_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trio_entries ENABLE ROW LEVEL SECURITY;

-- trio_users の RLS ポリシー
CREATE POLICY "Users can view their own data" ON public.trio_users
    FOR SELECT TO authenticated
    USING (id = auth.uid()); -- ※要件によりauth.uid()との紐付けが変わる可能性があるが、一旦標準的に実装

CREATE POLICY "Admins can manage trio_users" ON public.trio_users
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- trio_slots の RLS ポリシー (誰でも空き状況は見れるようにする)
CREATE POLICY "Anyone can view trio_slots" ON public.trio_slots
    FOR SELECT TO public
    USING (true);
CREATE POLICY "Anyone can view trio_slots authenticated" ON public.trio_slots
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Admins can manage trio_slots" ON public.trio_slots
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- trio_entries の RLS ポリシー
CREATE POLICY "Users can view their own entries" ON public.trio_entries
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage trio_entries" ON public.trio_entries
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
