
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTemplate() {
    console.log('Updating reception_completed template...');

    const body = `{{name}} 様

この度は、スイムパートナーズの体験レッスンにお申し込みいただき、誠にありがとうございます。

お客様のお申し込み内容と、ご希望の日程を確認いたしました。
【ご希望日程として承った日程】
 ・第1希望: {{date1}}
 ・第2希望: {{date2}}
 ・第3希望: {{date3}}

お送りいただいたご希望日をもとに、専任コーチの調整と正式な日程調整を進めさせていただきます。

迅速かつ確実に今後のご連絡をさせていただくため、大変恐れ入りますが、以下の手順で【スイムパートナーズ公式LINE】へのご登録をお願いいたします。

【ステップ１】公式LINEのご登録
体験レッスンの日程調整や担当コーチとの連携は、すべてLINEにて行います。
以下のボタンまたはQRコードより、ご登録をお願いいたします。
▼ 公式LINEへのご登録はこちら
https://lin.ee/F8FUuUK

【ステップ２】LINEトークルームへのメッセージ送信
LINEに登録後、トークルームにて以下の内容をメッセージで送信してください。
 ・お名前（フルネーム）： {{name}}
 ・その他確認事項がございましたらお知らせください。

（フォームでいただいた希望日をもとに、事務局よりLINEにて改めて調整のご連絡を差し上げますので、本メッセージへのご返信はこれで完了です。）

【今後の流れ】
 ・LINE登録・メッセージ送信完了
 ・事務局よりLINEにてご連絡（コーチ調整状況のご報告と日程調整）
 ・担当コーチの決定
 ・お客様へ担当コーチのLINEアカウントをご案内
 ・お客様とコーチ間で直接連絡開始（体験レッスン詳細確認）
 ・体験レッスン実施！

ご不明な点がございましたら、本メールにご返信いただくか、LINE登録後にメッセージにてお気軽にお問い合わせください。
あなたと一緒にプールでお会いできることを心より楽しみにしております！
────────────────────────
SWIM PARTNERS/スイムパートナーズ

Email：info.swimpartners@gmail.com
URL: https://swim-partners.com/
LINE:https://lin.ee/F8FUuUK
────────────────────────`;

    const { error } = await supabase
        .from('email_templates')
        .update({
            body: body,
            subject: '【Swim Partners】体験レッスンのお申し込みありがとうございます'
        })
        .eq('key', 'reception_completed');

    if (error) {
        console.error('Error updating template:', error);
    } else {
        console.log('Template updated successfully.');
    }
}

updateTemplate();
