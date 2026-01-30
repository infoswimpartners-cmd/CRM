
import { Client } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Default Templates
const defaultTemplates = [
    {
        key: 'inquiry_received',
        subject: '【Swim Partners】お問い合わせありがとうございます',
        body: `{{name}} 様

Swim Partnersへのお問い合わせ・体験申し込みありがとうございます。
内容を確認の上、担当者より日程調整のご連絡をさせていただきます。

今しばらくお待ちください。

--------------------------------------------------
Swim Partners
--------------------------------------------------`,
        variables: ['{{name}}'],
        description: 'フォーム送信直後にユーザーへ送られる自動返信メール'
    },
    {
        key: 'trial_payment_request',
        subject: '【Swim Partners】体験レッスンの日程確定と事前決済のお願い',
        body: `{{name}} 様

Swim Partnersです。
体験レッスンの日程が以下の通り確定いたしました。

■ 体験レッスン日時
{{lesson_date}}

つきましては、下記URLより体験レッスン料（¥{{amount}}）の事前決済をお願いいたします。
お支払いの完了を確認次第、予約確定となります。

▼ お支払いリンク
{{payment_link}}

当日お会いできるのを楽しみにしております。`,
        variables: ['{{name}}', '{{lesson_date}}', '{{amount}}', '{{payment_link}}'],
        description: '管理者が体験日時を確定した際に送る決済依頼メール'
    },
    {
        key: 'trial_confirmed',
        subject: '【Swim Partners】体験レッスンのお支払いが完了しました',
        body: `{{name}} 様

Swim Partnersです。
体験レッスンのお支払いが確認できました。

ご予約が正式に確定いたしました。
当日は以下の日時にお待ちしております。

■ 日時
{{lesson_date}}

■ 場所
ご指定のプール（詳細は担当者よりご連絡いたします）

よろしくお願いいたします。`,
        variables: ['{{name}}', '{{lesson_date}}'],
        description: '決済完了後に送られる予約確定メール'
    },
    {
        key: 'enrollment_complete',
        subject: '【Swim Partners】本入会手続きが完了しました',
        body: `{{name}} 様

Swim Partnersへの本入会手続きが完了いたしました。
以下のプランで登録されました。

■ ご登録プラン
{{plan_name}}

■ ご利用開始日 (定期課金開始日)
{{start_date}}
※ 開始日までのレッスンは、別途「都度利用」として合算請求されます。

これから一緒に頑張りましょう！
ご不明な点がございましたら、お気軽にお問い合わせください。

--------------------------------------------------
Swim Partners
--------------------------------------------------`,
        variables: ['{{name}}', '{{plan_name}}', '{{start_date}}'],
        description: '本入会フォーム送信後に送られる完了メール'
    }
]

async function main() {
    console.log('🚀 Starting Email Templates Migration...')

    // Check for connection string
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!connectionString) {
        console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment.')
        process.exit(1)
    }

    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Supabase requires SSL usually
    })

    try {
        await client.connect()
        console.log('✅ Connected to Database')

        // 1. Create Table
        console.log('📦 Creating email_templates table...')
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT UNIQUE NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                variables TEXT[],
                description TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                last_updated_by UUID REFERENCES profiles(id)
            );
        `)

        // 2. Enable RLS (Security)
        await client.query(`ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;`)

        // 3. Create Policy (Admins only)
        // Check if policy exists first to avoid error? Or just drop and recreate.
        await client.query(`
            DROP POLICY IF EXISTS "Enable read access for everyone" ON email_templates;
            DROP POLICY IF EXISTS "Enable all access for admins" ON email_templates;
            
            -- Allow read for authenticated users (or maybe just admins? For now admins)
            -- Actually, server-side code uses Service Role so it bypasses RLS. 
            -- But Admin Dashboard needs to read it with user token. 
            CREATE POLICY "Enable all access for admins" ON email_templates
                FOR ALL
                USING (
                    EXISTS (
                        SELECT 1 FROM profiles
                        WHERE profiles.id = auth.uid()
                        AND profiles.role = 'admin'
                    )
                );
        `)

        // 4. Seed Data
        console.log('🌱 Seeding default templates...')
        for (const tmpl of defaultTemplates) {
            await client.query(`
                INSERT INTO email_templates (key, subject, body, variables, description)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (key) DO UPDATE SET
                    variables = EXCLUDED.variables,
                    description = EXCLUDED.description
                    -- We DO NOT overwrite subject/body if it exists, to preserve user edits.
                    -- UNLESS we want to force reset? No, better safe.
                    -- Actually, if this is first run, it inserts. 
            `, [tmpl.key, tmpl.subject, tmpl.body, tmpl.variables, tmpl.description])
        }

        console.log('✅ Migration Complete!')

    } catch (e) {
        console.error('❌ Migration Failed:', e)
    } finally {
        await client.end()
    }
}

main()
