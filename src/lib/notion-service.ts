/**
 * Notion API 連携サービス
 * 毎日自動生成されたSTUDIO CMS向けSEO記事を、Notionデータベースへ自動投稿します。
 * STUDIO CMSのNotion同期機能を通じて、STUDIO公式サイト（swim-partners.com）へ完全自動反映されます。
 */

import { StudioCmsArticle } from './studio-cms-types';

export interface NotionSyncResult {
    success: boolean;
    pageId?: string;
    url?: string;
    message: string;
}

/**
 * MarkdownテキストをNotionブロック（children）の配列に変換
 */
export function markdownToNotionBlocks(markdown: string): any[] {
    const lines = markdown.split('\n');
    const blocks: any[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 見出し H1 / H2
        if (line.startsWith('## ') || line.startsWith('# ')) {
            const text = line.replace(/^#{1,2}\s+/, '');
            blocks.push({
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: text.substring(0, 2000) } }],
                },
            });
            continue;
        }

        // 見出し H3
        if (line.startsWith('### ')) {
            const text = line.replace(/^###\s+/, '');
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: text.substring(0, 2000) } }],
                },
            });
            continue;
        }

        // 箇条書きリスト
        if (line.startsWith('- ') || line.startsWith('* ')) {
            const text = line.replace(/^[-*]\s+/, '');
            blocks.push({
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{ type: 'text', text: { content: text.substring(0, 2000) } }],
                },
            });
            continue;
        }

        // 番号付きリスト
        if (/^\d+\.\s+/.test(line)) {
            const text = line.replace(/^\d+\.\s+/, '');
            blocks.push({
                object: 'block',
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: [{ type: 'text', text: { content: text.substring(0, 2000) } }],
                },
            });
            continue;
        }

        // 引用 / コールアウト
        if (line.startsWith('> ')) {
            const text = line.replace(/^>\s+/, '');
            blocks.push({
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{ type: 'text', text: { content: text.substring(0, 2000) } }],
                    icon: { emoji: '💡' },
                },
            });
            continue;
        }

        // 区切り線
        if (line === '---' || line === '***') {
            blocks.push({
                object: 'block',
                type: 'divider',
                divider: {},
            });
            continue;
        }

        // テーブル行（Markdownテーブルはコードブロックまたはテキストとして保持）
        if (line.startsWith('|')) {
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: line.substring(0, 2000) } }],
                },
            });
            continue;
        }

        // 通常の段落
        blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [{ type: 'text', text: { content: line.substring(0, 2000) } }],
            },
        });
    }

    // Notion APIの1回あたりのchildren上限（最大100ブロック）
    return blocks.slice(0, 95);
}

/**
 * Notion データベースのスキーマを取得してTitleプロパティ名を自動特定
 */
async function getNotionDatabaseTitleKey(databaseId: string, apiKey: string): Promise<string> {
    try {
        const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Notion-Version': '2022-06-28',
            },
        });

        if (res.ok) {
            const data = await res.json();
            const properties = data.properties || {};
            for (const [key, val] of Object.entries<any>(properties)) {
                if (val.type === 'title') {
                    return key;
                }
            }
        }
    } catch (e) {
        console.warn('[Notion API] Failed to fetch database schema, defaulting to Name:', e);
    }
    return '名前'; // デフォルトのタイトルプロパティ名
}

/**
 * 記事をNotionデータベースに自動投稿（新規ページ作成）
 */
export async function syncArticleToNotionDatabase(article: StudioCmsArticle): Promise<NotionSyncResult> {
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
        return {
            success: false,
            message: 'NOTION_API_KEY または NOTION_DATABASE_ID が環境変数に設定されていません。手動コピー機能が利用可能です。',
        };
    }

    try {
        const titlePropKey = await getNotionDatabaseTitleKey(databaseId.trim(), apiKey.trim());
        const blocks = markdownToNotionBlocks(article.bodyMarkdown);

        // プロパティの構築
        const properties: any = {
            [titlePropKey]: {
                title: [{ text: { content: article.title.substring(0, 2000) } }],
            },
        };

        // スラッグやメタディスクリプション等の付加プロパティ（存在すればセット）
        properties['Slug'] = {
            rich_text: [{ text: { content: article.slug.substring(0, 2000) } }],
        };
        properties['Description'] = {
            rich_text: [{ text: { content: article.metaDescription.substring(0, 2000) } }],
        };

        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey.trim()}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                parent: { database_id: databaseId.trim() },
                properties,
                children: blocks,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Notion API Error (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        const pageUrl = data.url || `https://notion.so/${data.id.replace(/-/g, '')}`;

        return {
            success: true,
            pageId: data.id,
            url: pageUrl,
            message: `Notionデータベースへ正常に自動投稿しました（STUDIOへ自動同期されます）。`,
        };
    } catch (err: any) {
        console.error('[Notion API Sync Exception]:', err);
        return {
            success: false,
            message: `Notion自動投稿に失敗しました: ${err.message}`,
        };
    }
}
