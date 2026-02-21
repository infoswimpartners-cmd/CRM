-- Create Inquiries Table
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- Link to Auth User
    student_id UUID REFERENCES students(id), -- Optional link to Student profile for easier querying
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- open, pending, closed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Inquiry Messages Table (Thread)
CREATE TABLE inquiry_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inquiry_id UUID REFERENCES inquiries(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id), -- Null if system message? Or Admin ID.
    is_admin BOOLEAN DEFAULT FALSE, -- To easily distinguish
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;

-- Policies for Inquiries
-- Users can view their own inquiries
CREATE POLICY "Users can view own inquiries" ON inquiries
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create inquiries
CREATE POLICY "Users can create inquiries" ON inquiries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all inquiries
CREATE POLICY "Admins can view all inquiries" ON inquiries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policies for Messages
-- Users can view messages for their own inquiries
CREATE POLICY "Users can view messages of own inquiries" ON inquiry_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM inquiries
            WHERE inquiries.id = inquiry_messages.inquiry_id
            AND inquiries.user_id = auth.uid()
        )
    );

-- Users can insert messages to their own open inquiries
CREATE POLICY "Users can reply to own inquiries" ON inquiry_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM inquiries
            WHERE inquiries.id = inquiry_messages.inquiry_id
            AND inquiries.user_id = auth.uid()
        )
    );

-- Admins can view/reply to all
CREATE POLICY "Admins can manage messages" ON inquiry_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_inquiries_modtime
    BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
