'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    MessageSquare,
    Save,
    Send,
    RotateCcw,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    Sparkles,
    FileText,
} from 'lucide-react';
import {
    getTrialFollowupConfigAction,
    saveTrialFollowupConfigAction,
    testSendTrialFollowupAction,
} from '@/actions/line-monitoring';
import { DEFAULT_TRIAL_FOLLOWUP_TEMPLATE } from '@/lib/line-trial-followup';

export function TrialFollowupSettingsCard() {
    const [enabled, setEnabled] = useState(true);
    const [template, setTemplate] = useState(DEFAULT_TRIAL_FOLLOWUP_TEMPLATE);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        recipient?: string;
        messageText?: string;
        timestamp?: string;
    } | null>(null);

    // 設定読み込み
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const res = await getTrialFollowupConfigAction();
                if (isMounted && res.success) {
                    setEnabled(res.enabled);
                    if (res.template) {
                        setTemplate(res.template);
                    }
                }
            } catch (err) {
                console.error('Failed to load trial followup config:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        load();
        return () => {
            isMounted = false;
        };
    }, []);

    // 設定保存
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await saveTrialFollowupConfigAction({ enabled, template });
            if (res.success) {
                toast.success('体験レッスン終了後フォロー設定を保存しました');
            } else {
                toast.error(res.error || '設定の保存に失敗しました');
            }
        } catch (err: any) {
            toast.error(err.message || 'エラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    // 初期デフォルト文面へリセット
    const handleReset = () => {
        if (confirm('テンプレートを初期デフォルト文面（アンケートURL・入会案内LIFF入り）に戻しますか？')) {
            setTemplate(DEFAULT_TRIAL_FOLLOWUP_TEMPLATE);
            toast.info('初期テンプレートにリセットしました。「設定を保存」で確定してください。');
        }
    };

    // テスト送信（厳格ルール: 会員番号0035、テスト太郎様限定）
    const handleTestSend = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await testSendTrialFollowupAction({ template });
            if (res.success) {
                toast.success(`テスト太郎様（会員番号0035）宛てにテスト送信が完了しました！`);
                setTestResult({
                    recipient: res.recipient,
                    messageText: res.messageText,
                    timestamp: new Date().toLocaleTimeString('ja-JP'),
                });
            } else {
                toast.error(res.error || 'テスト送信に失敗しました');
            }
        } catch (err: any) {
            toast.error(err.message || 'テスト送信エラーが発生しました');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card className="border-emerald-200/80 shadow-xs bg-white rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white p-5 border-b border-emerald-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                                <MessageSquare className="w-4 h-4" />
                            </span>
                            <CardTitle className="text-base font-bold text-slate-900">
                                体験レッスン報告後 LINE自動フォロー設定（Make内製化）
                            </CardTitle>
                            <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                                リアルタイム自動送信
                            </Badge>
                        </div>
                        <CardDescription className="text-xs text-slate-600">
                            コーチが体験レッスンの報告（完了）を提出した直後に、生徒の公式LINEへ体験アンケートやご入会案内を自動送信します。従来のMake連携を本システム内に完全統合しています。
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                        <span className="text-xs font-semibold text-slate-700">自動配信</span>
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            id="trial-followup-toggle"
                        />
                        <span className={`text-[11px] font-bold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {enabled ? 'ON' : 'OFF'}
                        </span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10 text-slate-400 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        設定を読み込み中...
                    </div>
                ) : (
                    <>
                        {/* 安全・仕様インフォメーション */}
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <div className="font-bold text-slate-800">
                                    二重送信防止 ＆ 個別トーク履歴自動同期
                                </div>
                                <p className="text-[11px] leading-relaxed text-slate-600">
                                    同一生徒への重複送信は自動でガードされます。送信されたメッセージは「個別トーク（チャット履歴）」にもリアルタイムで反映され、事務局スタッフが確認可能です。
                                </p>
                            </div>
                        </div>

                        {/* メッセージエディタ */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>送信メッセージ本文（テンプレート）</span>
                                </label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleReset}
                                    className="text-[11px] h-7 text-slate-500 hover:text-slate-700"
                                >
                                    <RotateCcw className="w-3 h-3 mr-1" />
                                    初期テンプレートに戻す
                                </Button>
                            </div>

                            <Textarea
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                rows={14}
                                className="font-mono text-xs leading-relaxed bg-white border-slate-200 focus:border-emerald-500 rounded-xl"
                                placeholder="体験レッスン終了後に送信するメッセージ本文を入力してください..."
                            />

                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>利用可能変数: {'{{name}}'}, {'{{coach_name}}'}, {'{{lesson_date}}'}, {'{{location}}'}</span>
                                <span>{template.length} 文字</span>
                            </div>
                        </div>

                        {/* テスト送信結果の表示 */}
                        {testResult && (
                            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs animate-in fade-in">
                                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>テスト送信成功（{testResult.timestamp}）- 送信先: {testResult.recipient}</span>
                                </div>
                                <div className="p-3 bg-white rounded-lg border border-emerald-100 text-[11px] text-slate-700 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                                    {testResult.messageText}
                                </div>
                            </div>
                        )}

                        {/* アクションボタンバー */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleTestSend}
                                disabled={isTesting || isSaving}
                                className="w-full sm:w-auto h-9 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl"
                            >
                                {isTesting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        テスト送信中...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-3.5 h-3.5 mr-1.5" />
                                        テスト太郎（0035）宛てにテスト送信
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving || isTesting}
                                className="w-full sm:w-auto h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs px-6"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        保存中...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-3.5 h-3.5 mr-1.5" />
                                        設定を保存する
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
