/**
 * Gemini を用いたステップ配信メッセージの自然化（Humanize / Naturalize）エンジン
 * 
 * テンプレートの要点（骨子・体験URL・直通返信案内）を100%維持しながら、
 * 「いかにも一斉配信のテンプレート臭さ」および「AI特有の堅苦しさ・不自然な敬語・セールス感」を除去し、
 * スイムパートナーズ専任スタッフが1対1で親身に話しかけているような自然で温かみのあるLINE文章を生成します。
 */

export interface GenerateNaturalStepMessageParams {
    stepStage: 1 | 2 | 3;
    originalTemplateText: string;
    customerName: string;
    trialUrl: string;
    customInstructions?: string;
}

const CANDIDATE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
];

/**
 * テンプレートを元に、GeminiでAI・テンプレ臭さを排除した人間らしい自然な文章を生成
 */
export async function generateNaturalStepMessage(
    params: GenerateNaturalStepMessageParams
): Promise<{ text: string; wasAiGenerated: boolean; modelUsed?: string; error?: string }> {
    const { stepStage, originalTemplateText, customerName, trialUrl, customInstructions } = params;

    // 元の置換済みテキスト（フォールバック用）
    const fallbackText = originalTemplateText
        .replace(/[{｛]{1,2}\s*name\s*[}｝]{1,2}/gi, customerName || 'お客様')
        .replace(/[{｛]{1,2}\s*trial_url\s*[}｝]{1,2}/gi, trialUrl);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('[LineStepGemini] GEMINI_API_KEY is not set. Falling back to template.');
        return { text: fallbackText, wasAiGenerated: false, error: 'GEMINI_API_KEY_NOT_CONFIGURED' };
    }

    const stageObjective =
        stepStage === 1
            ? '友だち追加翌日のフォロー。「近くに使えるプールがあるか」「平日の夕方や土日でも日程が合うか」といった場所と日時の不安を解消し、事務局が希望に合わせてプールをお調べできることを親身にお伝えする。'
            : stepStage === 2
                ? '友だち追加3日後のフォロー。水に顔をつけられない・進級テストで悩むお子様や、息継ぎ・25m完泳を目指す大人の方の悩みに寄り添い、マンツーマン個人指導ならではの安心感をお伝えする。'
                : '友だち追加5日後のフォロー。申込フォーム入力の手間を感じている方へ向け、このLINEチャットに直接「希望日時」や「お悩み」を返信するだけで相談できる直通ルートをご案内する。';

    const systemPrompt = `あなたは出張プライベート水泳レッスン「スイムパートナーズ」の親切で温かい専任カウンセラー（実在のスタッフ）です。
公式LINEに登録いただいたお客様（${customerName || 'お客様'}）に向けて、1対1のLINEチャットで親身に語りかけるメッセージを作成してください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【最重要指針：テンプレート臭・AI生成らしさの完全排除】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
いかにもシステムが一斉送信したような定型文や、AI特有の堅苦しい文章は、お客様に警戒感や距離感を与えてしまいます。
以下の「AI・テンプレ臭さ」を徹底的に排除してください：

1. 【過剰なビジネス敬語の禁止】
   × 「〜でございます」「〜していただければ幸甚に存じます」「ご不明な点等がございましたらお気軽にお申し付けください」
   ○ 「〜です！」「〜してみてくださいね😊」「気になることがあれば、いつでもこのチャットで聞いてください！」のような、丁寧でありながら血の通った親しみやすい口調。

2. 【不自然な接続詞・定型前置きの禁止】
   × 「さて、」「つきましては、」「なお、」「また、水泳に関しましては…」などの不自然な文章のつなぎ。
   × 「平素より格別のご高配を賜り…」などの形式的な挨拶。

3. 【セールス・広告臭の排除】
   × 「今すぐチェック！」「大人気の枠が残りわずか！」「見逃せないチャンスです」といった煽り文句。
   ○ 相手の疑問やお悩みにそっと共感し、「もしよろしければ」「無理のないペースで」と寄り添うスタンス。

4. 【LINEに最適なテンポとリズム】
   - スマートフォンのLINE画面でパッと見て読みやすいように、1〜2文ごとに自然に改行を入れる。
   - 詰め込みすぎず、親身なスタッフがスマホでメッセージを打っているような人間味のあるリズム。
   - 自然で温かい絵文字（😊, 🏊‍♂️, ✨, 💡 など）を適度（2〜4個程度）に散りばめる。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【必須要件（必ず守ること）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・このステップの目的: ${stageObjective}
・お客様のお名前: ${customerName || 'お客様'} 様（呼びかけに使用）
・元のテンプレートが伝えている【骨子・大切な案内事項】を漏れなく伝えること。
${stepStage === 3 ? '・お申し込みフォームを開かなくても、このLINEチャットに「①ご希望の日時」「②現在のお悩み」を返信するだけで相談できる旨を必ず分かりやすく案内すること。' : ''}
${trialUrl && stepStage !== 3 ? `・体験レッスンのURLとして必ず「${trialUrl}」をそのまま記載すること（URLを変更・短縮・省略しない）。` : ''}
${customInstructions ? `・追加の特別指示: ${customInstructions}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【出力形式・厳格な制限（違反厳禁）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
・出力は【送信するLINEメッセージ1通のみ】を直接出力してください。
・パターン分け（パターン1、パターン2、案A、案Bなど）は絶対に作らず、最も完成度の高い1つの文章のみを出力してください。
・「ご提案します」「以下が作成したメッセージです」「解説」「ポイント」等の前置き・解説・見出し・補足は一切出力禁止です。
・最初の1文字目から最後の1文字まで、お客様にそのまま送信するLINEメッセージ本文のみを出力してください。`;

    const userPrompt = `以下のベーステンプレートを基に、伝えたい要点とURLをしっかり維持した上で、テンプレートやAI生成らしさを除いた、親身な専属スタッフからの1対1メッセージ（1通のみ）に自然化して出力してください。

【ベーステンプレート】
${fallbackText}`;

    let generatedText = '';
    let usedModel = '';
    let lastError = '';

    for (const model of CANDIDATE_MODELS) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: systemPrompt },
                                { text: userPrompt },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.75, // 自然なバリエーションを持たせる
                        maxOutputTokens: 4096, // thinkingトークン消費を考慮した十分なバッファ
                    },
                }),
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const parts = data.candidates?.[0]?.content?.parts || [];
                const rawText = parts
                    .map((p: any) => p.text || '')
                    .filter(Boolean)
                    .join('');
                if (rawText && rawText.trim().length > 30) {
                    generatedText = sanitizeGeminiOutput(rawText);
                    usedModel = model;
                    break;
                }
            } else {
                const errBody = await res.text();
                lastError = `Gemini (${model}) ${res.status}: ${errBody.slice(0, 200)}`;
            }
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            lastError = fetchErr.message || String(fetchErr);
        }
    }

    if (!generatedText) {
        console.warn(`[LineStepGemini] Generation failed. Error: ${lastError}. Using fallback template.`);
        return { text: fallbackText, wasAiGenerated: false, error: lastError };
    }

    // Step 1 or Step 2 で体験URLが必須なのにGeminiが脱落させた場合の安全リカバリー
    if (stepStage !== 3 && trialUrl && !generatedText.includes(trialUrl)) {
        generatedText += `\n\n▼体験レッスンの詳細・空き状況はこちら\n${trialUrl}`;
    }

    return {
        text: generatedText,
        wasAiGenerated: true,
        modelUsed: usedModel,
    };
}

/**
 * Geminiの出力からMarkdownコードブロックや前置きなどの余計なメタ情報を除去
 */
function sanitizeGeminiOutput(rawText: string): string {
    let text = rawText.trim();

    // ```markdown ... ``` や ```text ... ``` の除去
    if (text.startsWith('```')) {
        text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    // 末尾の解説やポイント部分（--- \n ### ポイント...）の除去
    if (text.match(/\n---\s*\n\s*(###\s*(ポイント|解説|ブラッシュアップ|工夫した点)|💡)/)) {
        const parts = text.split(/\n---\s*\n\s*(###\s*(ポイント|解説|ブラッシュアップ|工夫した点)|💡)/);
        if (parts[0] && parts[0].trim().length > 50) {
            text = parts[0].trim();
        }
    }

    // 冒頭の「パターン1:」「案1:」や「以下のメッセージをご提案します」等の除去
    text = text.replace(/^[\s\S]*?(パターン[1-9１-９A-Za-z]|案[1-9１-９A-Za-z])[：:\s\n]*/, () => {
        return '';
    }).trim();

    // 次のパターン（--- の後にパターン2や案2が続く場合）が後ろに残っている場合は最初のパターンのみ残す
    if (text.match(/\n---\s*\n\s*(###\s*(パターン|案)|(パターン|案)[2-9２-９B-Zb-z])/)) {
        text = text.split(/\n---\s*\n\s*(###\s*(パターン|案)|(パターン|案)[2-9２-９B-Zb-z])/)[0].trim();
    }

    // 「はい、承知いたしました。」「以下がメッセージです：」等の冒頭挨拶を除去
    text = text.replace(/^(はい、?|承知いたしました[。！\n]|以下の(メッセージ|文章)[^\n]*[：:\n]+)/g, '').trim();

    return text;
}
