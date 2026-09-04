'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Send, ShieldCheck, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
    addKeywordAction,
    addGeoPromptAction,
    testSendGoogleChatReport,
    saveSpTrackerWebhookUrlAction,
} from '@/actions/sp-tracker-actions';

interface SpTrackerSettingsViewProps {
    webhookConfigured: boolean;
    currentWebhookUrl?: string;
    onRefresh: () => Promise<void>;
}

export function SpTrackerSettingsView({
    webhookConfigured,
    currentWebhookUrl = '',
    onRefresh,
}: SpTrackerSettingsViewProps) {
    const [newKeyword, setNewKeyword] = useState('');
    const [newArea, setNewArea] = useState('tokyo_23');
    const [newTarget, setNewTarget] = useState('adult');
    const [isSubmittingKw, setIsSubmittingKw] = useState(false);

    const [newPrompt, setNewPrompt] = useState('');
    const [newIntent, setNewIntent] = useState('adult');
    const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);

    const [webhookUrlInput, setWebhookUrlInput] = useState(currentWebhookUrl);
    const [isSavingWebhook, setIsSavingWebhook] = useState(false);
    const [isTestingWebhook, setIsTestingWebhook] = useState(false);

    useEffect(() => {
        if (currentWebhookUrl) {
            setWebhookUrlInput(currentWebhookUrl);
        }
    }, [currentWebhookUrl]);

    const handleSaveWebhook = async () => {
        setIsSavingWebhook(true);
        try {
            const res = await saveSpTrackerWebhookUrlAction(webhookUrlInput);
            if (res.success) {
                toast.success(res.message || 'Webhook URLを保存しました');
                await onRefresh();
            } else {
                toast.error(res.message || '保存に失敗しました');
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
        } finally {
            setIsSavingWebhook(false);
        }
    };

    const handleAddKeyword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKeyword.trim()) return;
        setIsSubmittingKw(true);
        try {
            const res = await addKeywordAction(newKeyword, newArea, newTarget);
            if (res.success) {
                toast.success(`キーワード「${newKeyword}」を追加しました`);
                setNewKeyword('');
                await onRefresh();
            } else {
                toast.error(res.message || '追加に失敗しました');
            }
        } finally {
            setIsSubmittingKw(false);
        }
    };

    const handleAddPrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPrompt.trim()) return;
        setIsSubmittingPrompt(true);
        try {
            const res = await addGeoPromptAction(newPrompt, newIntent);
            if (res.success) {
                toast.success(`想定質問プロンプトを追加しました`);
                setNewPrompt('');
                await onRefresh();
            } else {
                toast.error(res.message || '追加に失敗しました');
            }
        } finally {
            setIsSubmittingPrompt(false);
        }
    };

    const handleTestWebhook = async () => {
        setIsTestingWebhook(true);
        try {
            const res = await testSendGoogleChatReport(webhookUrlInput || undefined);
            if (res.success) {
                toast.success('Google Chatへテスト配信（Cards v2形式）を送信しました！');
            } else {
                toast.error(`送信失敗: ${res.message}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
        } finally {
            setIsTestingWebhook(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Google Chat 週次配信設定 */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-100 gap-4">
                    <div>
                        <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                            AUTOMATED WEEKLY PUSH NOTIFICATIONS
                        </div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                            Google Chat（毎週月曜 8:30 JST）週次配信設定
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                            Google Chat Cards v2 形式で、先週のSEO/GEOサマリーと今週の最優先アクション指示を自動通知します。
                        </p>
                    </div>

                    {webhookConfigured ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Webhook設定済み
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Webhook未設定
                        </span>
                    )}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono font-bold text-zinc-700 uppercase mb-1">
                            GOOGLE CHAT INCOMING WEBHOOK URL
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="text"
                                value={webhookUrlInput}
                                onChange={(e) => setWebhookUrlInput(e.target.value)}
                                placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-mono focus:outline-none focus:border-zinc-900"
                            />
                            <button
                                onClick={handleSaveWebhook}
                                disabled={isSavingWebhook}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0 shadow-sm"
                            >
                                <Save className={`w-3.5 h-3.5 ${isSavingWebhook ? 'animate-spin' : ''}`} />
                                {isSavingWebhook ? '保存中...' : 'Webhookを保存'}
                            </button>
                            <button
                                onClick={handleTestWebhook}
                                disabled={isTestingWebhook || !webhookUrlInput}
                                className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
                            >
                                <Send className={`w-3.5 h-3.5 ${isTestingWebhook ? 'animate-spin' : ''}`} />
                                {isTestingWebhook ? '送信中...' : '今すぐテスト配信'}
                            </button>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5">
                            ※ 入力したWebhook URLを「Webhookを保存」でデータベースに登録すると、毎週月曜 8:30 JST に定期自動配信されます。
                        </p>
                    </div>
                </div>
            </div>

            {/* キーワード追加・マスタ管理 */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        KEYWORD REGISTRATION
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        追跡SEOキーワードの追加
                    </h3>
                </div>

                <form onSubmit={handleAddKeyword} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6">
                        <label className="block text-xs text-zinc-500 font-medium mb-1">キーワード</label>
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            placeholder="例: 出張 水泳 目黒区"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs focus:outline-none focus:border-zinc-900"
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <label className="block text-xs text-zinc-500 font-medium mb-1">エリア軸</label>
                        <select
                            value={newArea}
                            onChange={(e) => setNewArea(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs focus:outline-none focus:border-zinc-900"
                        >
                            <option value="tokyo_23">東京23区</option>
                            <option value="kanagawa">神奈川</option>
                            <option value="chiba">千葉</option>
                        </select>
                    </div>
                    <div className="sm:col-span-3">
                        <label className="block text-xs text-zinc-500 font-medium mb-1">セグメント軸</label>
                        <select
                            value={newTarget}
                            onChange={(e) => setNewTarget(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs focus:outline-none focus:border-zinc-900"
                        >
                            <option value="adult">大人・泳ぎ直し</option>
                            <option value="junior">子供・ジュニア</option>
                            <option value="phobia">水恐怖症</option>
                            <option value="triathlon">トライアスロン</option>
                        </select>
                    </div>
                    <div className="sm:col-span-12 flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmittingKw || !newKeyword.trim()}
                            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> キーワードを登録
                        </button>
                    </div>
                </form>
            </div>

            {/* GEO想定質問プロンプト追加 */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="border-b border-zinc-100 pb-4">
                    <div className="text-[11px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-1">
                        GEO PROMPT REGISTRATION
                    </div>
                    <h3 className="text-2xl font-extrabold tracking-tight text-zinc-900">
                        定点観測GEOプロンプト（想定質問）の追加
                    </h3>
                </div>

                <form onSubmit={handleAddPrompt} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-9">
                        <label className="block text-xs text-zinc-500 font-medium mb-1">想定される顧客の質問文</label>
                        <input
                            type="text"
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            placeholder="例: 世田谷区で子供がマンツーマンで泳げる水泳個人レッスンを探しています"
                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs focus:outline-none focus:border-zinc-900"
                        />
                    </div>
                    <div className="sm:col-span-3">
                        <label className="block text-xs text-zinc-500 font-medium mb-1">意図カテゴリ</label>
                        <select
                            value={newIntent}
                            onChange={(e) => setNewIntent(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs focus:outline-none focus:border-zinc-900"
                        >
                            <option value="adult">大人</option>
                            <option value="junior">子供</option>
                            <option value="comparison">比較検討</option>
                            <option value="phobia">水恐怖症</option>
                            <option value="triathlon">トライアスロン</option>
                        </select>
                    </div>
                    <div className="sm:col-span-12 flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={isSubmittingPrompt || !newPrompt.trim()}
                            className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" /> プロンプトを登録
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
