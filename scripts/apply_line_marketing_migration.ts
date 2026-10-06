/**
 * LINEマーケティングシステム DBマイグレーション適用スクリプト
 * 
 * 実行方法:
 *   npx tsx scripts/apply_line_marketing_migration.ts
 */

import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function applyMigration() {
    console.log('=== [LINE Marketing DB Migration Tool] ===\n');

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!connectionString) {
        console.warn('⚠️  DATABASE_URL または POSTGRES_URL が .env.local に設定されていません。');
        console.log('📌 Supabase WebダッシュボードのSQL Editorから以下のマイグレーションSQLを実行してください:');
        console.log('   ファイルパス: supabase/migrations/20260930120000_line_marketing_system.sql');
        console.log('   URL: https://supabase.com/dashboard/project/svsmgjulytmhlxcaczge/sql/new\n');
        return;
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ PostgreSQLデータベースに接続しました。');

        const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260930120000_line_marketing_system.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('🚀 マイグレーションを実行中...');
        await client.query(sql);
        console.log('🎉 マイグレーション 20260930120000_line_marketing_system.sql が正常に適用されました！');
    } catch (err: any) {
        console.error('❌ マイグレーション実行中にエラーが発生しました:', err.message);
        throw err;
    } finally {
        await client.end();
    }
}

applyMigration().catch((e) => {
    console.error(e);
    process.exit(1);
});
