CREATE TABLE public.student_statuses (
    id text PRIMARY KEY,
    name text NOT NULL,
    color_class text NOT NULL DEFAULT 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    display_order integer NOT NULL DEFAULT 0,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Settings
ALTER TABLE public.student_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to student_statuses" 
ON public.student_statuses FOR SELECT USING (true);

CREATE POLICY "Allow admin to insert student_statuses"
ON public.student_statuses FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin to update student_statuses"
ON public.student_statuses FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Allow admin to delete non-system statuses"
ON public.student_statuses FOR DELETE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
    AND is_system = false
);

-- Insert initial values based on existing system definitions + new ''trial_billed''
INSERT INTO public.student_statuses (id, name, color_class, display_order, is_system) VALUES
('inquiry', '問合せ対応中', 'bg-orange-100 text-orange-800 hover:bg-orange-200', 10, true),
('trial_pending', '体験予定', 'bg-gray-100 text-gray-800 hover:bg-gray-200', 20, true),
('trial_billed', '体験案内済', 'bg-blue-100 text-blue-800 hover:bg-blue-200', 30, true),
('trial_confirmed', '体験確定済', 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200', 40, true),
('trial_done', '体験受講済', 'bg-purple-100 text-purple-800 hover:bg-purple-200', 50, false),
('active', '会員', 'bg-green-100 text-green-800 hover:bg-green-200', 60, true),
('resting', '休会中', 'bg-gray-200 text-gray-600 hover:bg-gray-300', 70, false),
('withdrawn', '退会', 'bg-red-100 text-red-800 hover:bg-red-200', 80, false);
