'use server';

import {
    askJohnMarketer,
    generateJohnDailyBriefing,
    ChatMessage,
    JohnBriefing,
} from '@/lib/ai-marketer-john';
import { getSpTrackerDashboard } from './sp-tracker-actions';

/**
 * ジョンからのデイリーブリーフィングを取得
 */
export async function getJohnDailyBriefingAction(): Promise<JohnBriefing> {
    try {
        const dashboard = await getSpTrackerDashboard();
        return generateJohnDailyBriefing(dashboard.rankWatchState, dashboard.spreadsheetAnalytics);
    } catch (err) {
        console.error('getJohnDailyBriefingAction error:', err);
        return generateJohnDailyBriefing();
    }
}

/**
 * ジョンへ質問・マーケティング壁打ちを送信
 */
export async function askJohnAction(
    question: string,
    history: ChatMessage[] = []
): Promise<{ success: boolean; answer: string }> {
    try {
        const dashboard = await getSpTrackerDashboard().catch(() => null);
        const answer = await askJohnMarketer(question, history, {
            rankWatchState: dashboard?.rankWatchState,
            spreadsheetData: dashboard?.spreadsheetAnalytics,
        });

        return {
            success: true,
            answer,
        };
    } catch (err: any) {
        console.error('askJohnAction error:', err);
        return {
            success: false,
            answer: '申し訳ございません。分析中に一時的なエラーが発生しました。もう一度ご質問いただけますでしょうか。',
        };
    }
}
