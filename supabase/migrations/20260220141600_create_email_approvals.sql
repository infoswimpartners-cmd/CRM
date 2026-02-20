-- Create email_approvals table
CREATE TABLE IF NOT EXISTS public.email_approvals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    to_email TEXT NOT NULL,
    bcc_email TEXT,
    subject TEXT NOT NULL,
    text_body TEXT NOT NULL,
    html_body TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_approvals ENABLE ROW LEVEL SECURITY;

-- Create policies (only admin can read/update)
CREATE POLICY "Enable read access for admin" ON public.email_approvals
    FOR SELECT
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Enable update access for admin" ON public.email_approvals
    FOR UPDATE
    USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Add updated_at trigger if applicable, though created_at and approved_at are main indicators.
