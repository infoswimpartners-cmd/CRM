import { ActionRecommendationItem } from './sp-tracker-seed';

/**
 * Google Chat Webhook へ Google Chat Cards v2 形式で週次アクションレポートを送信する
 */
export async function sendSpTrackerWeeklyReport({
    webhookUrl,
    periodText,
    seoTopRate,
    geoSovRate,
    citationGapCount,
    internalHealthScore,
    actions,
}: {
    webhookUrl: string;
    periodText: string;
    seoTopRate: number;
    geoSovRate: number;
    citationGapCount: number;
    internalHealthScore: number;
    actions: ActionRecommendationItem[];
}): Promise<{ success: boolean; message?: string }> {
    if (!webhookUrl) {
        return { success: false, message: 'Google Chat Webhook URL が設定されていません。' };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://manager.swim-partners.com';
    const dashboardUrl = `${appUrl}/admin/geo-seo`;

    // アクションウィジェットの生成
    const actionWidgets: any[] = [];
    actions.slice(0, 3).forEach((action, idx) => {
        const priorityBadge = action.priority === 'high' ? '🔴【最優先】' : action.priority === 'medium' ? '🟡【改善チャンス】' : '🟢【維持・良好】';
        
        actionWidgets.push({
            decoratedText: {
                topLabel: `${priorityBadge} ${action.category.toUpperCase()}`,
                text: `<b>${action.title}</b>`,
                bottomLabel: `指示: ${action.action_directive}`,
                wrapText: true,
                button: {
                    text: '対応画面を開く',
                    onClick: {
                        openLink: {
                            url: action.action_link ? `${appUrl}${action.action_link}` : dashboardUrl
                        }
                    }
                }
            }
        });
    });

    const cardsV2Payload = {
        cardsV2: [
            {
                cardId: 'sp-tracker-weekly-card',
                card: {
                    header: {
                        title: 'スイムパートナーズ週次アクション指示',
                        subtitle: `対象期間: ${periodText}（SP-Tracker 自動配信）`,
                        imageUrl: 'https://cdn-icons-png.flaticon.com/512/3208/3208676.png',
                        imageType: 'CIRCLE',
                    },
                    sections: [
                        {
                            header: '📊 先週のパフォーマンスサマリー',
                            widgets: [
                                {
                                    columns: {
                                        columnItems: [
                                            {
                                                horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                                                horizontalAlignment: 'CENTER',
                                                verticalAlignment: 'CENTER',
                                                widgets: [
                                                    {
                                                        decoratedText: {
                                                            topLabel: 'SEO主要KW上位率',
                                                            text: `<b>${seoTopRate}%</b> (TOP3)`
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                                                horizontalAlignment: 'CENTER',
                                                verticalAlignment: 'CENTER',
                                                widgets: [
                                                    {
                                                        decoratedText: {
                                                            topLabel: 'AI言及率 (GEO SOV)',
                                                            text: `<b>${geoSovRate}%</b>`
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                },
                                {
                                    columns: {
                                        columnItems: [
                                            {
                                                horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                                                horizontalAlignment: 'CENTER',
                                                verticalAlignment: 'CENTER',
                                                widgets: [
                                                    {
                                                        decoratedText: {
                                                            topLabel: '未掲載の引用メディア',
                                                            text: `<b>${citationGapCount}件</b> (ギャップ)`
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
                                                horizontalAlignment: 'CENTER',
                                                verticalAlignment: 'CENTER',
                                                widgets: [
                                                    {
                                                        decoratedText: {
                                                            topLabel: '内部SEOスコア',
                                                            text: `<b>${internalHealthScore}点</b> / 100`
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            ]
                        },
                        {
                            header: '🎯 今週の具体的アクション指示（最大3件）',
                            widgets: actionWidgets.length > 0 ? actionWidgets : [
                                {
                                    decoratedText: {
                                        text: '🟢 現在急を要する改善課題はありません。安定して上位およびAI引用を獲得しています。'
                                    }
                                }
                            ]
                        },
                        {
                            widgets: [
                                {
                                    buttonList: {
                                        buttons: [
                                            {
                                                text: 'SP-Tracker ダッシュボード全体を開く',
                                                color: { red: 0.1, green: 0.4, blue: 0.9, alpha: 1 },
                                                onClick: {
                                                    openLink: {
                                                        url: dashboardUrl
                                                    }
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(cardsV2Payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SP-Tracker Notifier] Failed:', response.status, errorText);
            return { success: false, message: `送信エラー (${response.status}): ${errorText}` };
        }

        console.log('[SP-Tracker Notifier] Weekly Card successfully delivered.');
        return { success: true };
    } catch (err: any) {
        console.error('[SP-Tracker Notifier] Network/Request Error:', err);
        return { success: false, message: err.message || '送信に失敗しました' };
    }
}
