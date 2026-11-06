'use client';

/**
 * Make風 自動配信シナリオ一括管理・微調整タブ
 * 
 * 各種自動送信シナリオ（体験後フォロー、離脱ステップ配信、コーチ報告下書き、
 * アクティビティ復帰、リマインダー等）のフローを可視化し、ワンクリックでのON/OFFや
 * テンプレート文面の微調整、テスト太郎（0035）宛てのテスト送信を提供します。
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    Zap,
    Play,
    Pause,
    FileEdit,
    RotateCcw,
    Send,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    Clock,
    UserCheck,
    MessageSquare,
    BellRing,
    Calendar,
    Layers,
    Sparkles,
    ShieldCheck,
    ExternalLink,
    HelpCircle,
    Bot,
} from 'lucide-react';
import {
    AutomationScenario,
    ScenarioStatus,
} from '@/types/automation-scenarios';
import {
    getAutomationScenariosAction,
    saveScenarioConfigAction,
    testSendScenarioAction,
} from '@/actions/automation-scenarios';
import { getStaleLocalCache, setLocalCache } from '@/lib/local-cache';

const SCENARIOS_CACHE_KEY = 'line_automation_scenarios';

export function AutomationScenariosTab() {
    const [scenarios, setScenarios] = useState<AutomationScenario[]>(() => {
        return getStaleLocalCache<AutomationScenario[]>(SCENARIOS_CACHE_KEY) || [];
    });
    const [isLoading, setIsLoading] = useState(() => !getStaleLocalCache(SCENARIOS_CACHE_KEY));
    const [editingScenario, setEditingScenario] = useState<AutomationScenario | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{
        recipient?: string;
        messageText?: string;
        timestamp?: string;
    } | null>(null);

    // 編集モーダル用の入力ステート
    const [formStatus, setFormStatus] = useState<ScenarioStatus>('active');
    const [formTemplate, setFormTemplate] = useState('');
    const [formFeedbackMode, setFormFeedbackMode] = useState<'draft' | 'auto_send' | 'disabled'>('draft');
    const [formGChatWebhook, setFormGChatWebhook] = useState('');

    // シナリオ一覧取得
    const fetchScenarios = useCallback(async () => {
        if (!getStaleLocalCache(SCENARIOS_CACHE_KEY)) {
            setIsLoading(true);
        }
        try {
            const res = await getAutomationScenariosAction();
            if (res.success && res.data) {
                setScenarios(res.data);
                setLocalCache(SCENARIOS_CACHE_KEY, res.data);
            } else {
                toast.error(res.error || 'シナリオ一覧の取得に失敗しました');
            }
        } catch (e: any) {
            toast.error(e.message || 'データ取得エラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchScenarios();
    }, [fetchScenarios]);

    // 集計カウント
    const activeCount = scenarios.filter(s => s.status === 'active').length;
    const draftCount = scenarios.filter(s => s.status === 'draft').length;
    const pausedCount = scenarios.filter(s => s.status === 'paused').length;

    // クイックON/OFFスイッチ切り替え
    const handleQuickToggle = async (scenario: AutomationScenario) => {
        let newStatus: ScenarioStatus = 'active';
        if (scenario.status === 'active') {
            newStatus = 'paused';
        } else if (scenario.status === 'paused') {
            newStatus = scenario.id === 'lesson_report_feedback' ? 'draft' : 'active';
        } else if (scenario.status === 'draft') {
            newStatus = 'paused';
        }

        try {
            const res = await saveScenarioConfigAction({
                scenarioId: scenario.id,
                status: newStatus,
                template: scenario.template,
                extraSettings: {
                    ...scenario.extraSettings,
                    feedbackMode: scenario.id === 'lesson_report_feedback'
                        ? (newStatus === 'active' ? 'auto_send' : newStatus === 'draft' ? 'draft' : 'disabled')
                        : undefined,
                },
            });

            if (res.success) {
                toast.success(`「${scenario.name}」のステータスを変更しました`);
                await fetchScenarios();
            } else {
                toast.error(res.error || '更新に失敗しました');
            }
        } catch (e: any) {
            toast.error(e.message || 'エラーが発生しました');
        }
    };

    // 微調整モーダルを開く
    const handleOpenEdit = (scenario: AutomationScenario) => {
        setEditingScenario(scenario);
        setFormStatus(scenario.status);
        setFormTemplate(scenario.template);
        setFormFeedbackMode(scenario.extraSettings?.feedbackMode || 'draft');
        setFormGChatWebhook(scenario.extraSettings?.gchatWebhookUrl || '');
        setTestResult(null);
    };

    // モーダル設定保存
    const handleSaveEdit = async () => {
        if (!editingScenario) return;
        setIsSaving(true);
        try {
            const res = await saveScenarioConfigAction({
                scenarioId: editingScenario.id,
                status: formStatus,
                template: formTemplate,
                extraSettings: {
                    ...editingScenario.extraSettings,
                    feedbackMode: editingScenario.id === 'lesson_report_feedback' ? formFeedbackMode : undefined,
                    gchatWebhookUrl: formGChatWebhook.trim() || null,
                },
            });

            if (res.success) {
                toast.success(`「${editingScenario.name}」の設定を保存しました`);
                setEditingScenario(null);
                await fetchScenarios();
            } else {
                toast.error(res.error || '設定保存に失敗しました');
            }
        } catch (e: any) {
            toast.error(e.message || '保存エラーが発生しました');
        } finally {
            setIsSaving(false);
        }
    };

    // 変数をカーソル位置/末尾に挿入
    const handleInsertVariable = (varKey: string) => {
        setFormTemplate(prev => prev + `{{${varKey}}}`);
        toast.info(`変数 {{${varKey}}} を挿入しました`);
    };

    // 初期テンプレートへリセット
    const handleResetDefault = () => {
        if (!editingScenario) return;
        if (confirm('テンプレートを初期デフォルト文面に戻しますか？')) {
            setFormTemplate(editingScenario.defaultTemplate);
            toast.info('初期テンプレートにリセットしました。「設定を保存」で確定してください。');
        }
    };

    // テスト送信（厳格ルール: 会員番号0035、テスト太郎様限定）
    const handleTestSend = async () => {
        if (!editingScenario) return;
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await testSendScenarioAction({
                scenarioId: editingScenario.id,
                customTemplate: formTemplate,
            });

            if (res.success) {
                toast.success('テスト太郎様（会員番号0035）宛てにテスト送信が完了しました！');
                setTestResult({
                    recipient: res.recipient,
                    messageText: res.messageText,
                    timestamp: new Date().toLocaleTimeString('ja-JP'),
                });
            } else {
                toast.error(res.error || 'テスト送信に失敗しました');
            }
        } catch (e: any) {
            toast.error(e.message || 'テスト送信エラー');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* メインヘッダーバナー（Make風デザイン） */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-600 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs text-white">
                            <Zap className="w-5 h-5" />
                        </span>
                        <h2 className="text-lg font-bold tracking-tight">
                            自動配信シナリオ統合管理ハブ（Makeシナリオ連携内製化）
                        </h2>
                        <Badge className="bg-white/25 text-white hover:bg-white/30 text-[11px] border-none">
                            全 {scenarios.length} シナリオ
                        </Badge>
                    </div>
                    <p className="text-xs text-white/90 leading-relaxed max-w-3xl">
                        Makeで管理していた外部Webhookやステップ配信・リマインダー等の自動配信シナリオを本システム内に完全統合。
                        各シナリオの実行フロー、稼働状況、メッセージ文面をワンストップで微調整・テスト送信できます。
                    </p>
                </div>

                {/* メトリクスバッジ */}
                <div className="flex items-center gap-2 shrink-0 self-start md:self-center bg-black/15 p-2 rounded-xl backdrop-blur-xs border border-white/10">
                    <div className="px-2.5 py-1 text-center">
                        <div className="text-[10px] text-white/80 font-medium">稼働中</div>
                        <div className="text-base font-extrabold text-emerald-300">{activeCount}</div>
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <div className="px-2.5 py-1 text-center">
                        <div className="text-[10px] text-white/80 font-medium">下書き保存</div>
                        <div className="text-base font-extrabold text-amber-300">{draftCount}</div>
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <div className="px-2.5 py-1 text-center">
                        <div className="text-[10px] text-white/80 font-medium">停止中</div>
                        <div className="text-base font-extrabold text-white/60">{pausedCount}</div>
                    </div>
                </div>
            </div>

            {/* シナリオ一覧カードリスト */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    シナリオ構成を読み込み中...
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {scenarios.map((scenario) => {
                        const isActive = scenario.status === 'active';
                        const isDraft = scenario.status === 'draft';
                        const isPaused = scenario.status === 'paused';

                        return (
                            <Card
                                key={scenario.id}
                                className={`border rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs hover:shadow-xs ${
                                    isActive
                                        ? 'border-emerald-200/90 bg-white'
                                        : isDraft
                                            ? 'border-amber-200 bg-amber-50/20'
                                            : 'border-slate-200 bg-slate-50/50 opacity-90'
                                }`}
                            >
                                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    {/* 左側: シナリオ基本情報 & Make風フローダイアグラム */}
                                    <div className="space-y-3 flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span
                                                className={`p-1.5 rounded-lg text-white shadow-2xs ${
                                                    isActive
                                                        ? 'bg-emerald-600'
                                                        : isDraft
                                                            ? 'bg-amber-600'
                                                            : 'bg-slate-400'
                                                }`}
                                            >
                                                {scenario.category === 'post_lesson' ? (
                                                    <MessageSquare className="w-4 h-4" />
                                                ) : scenario.category === 'cart_recovery' ? (
                                                    <Zap className="w-4 h-4" />
                                                ) : scenario.category === 'activity' ? (
                                                    <Clock className="w-4 h-4" />
                                                ) : scenario.category === 'reminder' ? (
                                                    <Calendar className="w-4 h-4" />
                                                ) : (
                                                    <Layers className="w-4 h-4" />
                                                )}
                                            </span>

                                            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                                                {scenario.name}
                                            </h3>

                                            <Badge
                                                className={`text-[10px] px-2 py-0.5 font-bold ${
                                                    isActive
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                        : isDraft
                                                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                            : 'bg-slate-200 text-slate-600 border-slate-300'
                                                }`}
                                                variant="outline"
                                            >
                                                {scenario.statusLabel}
                                            </Badge>

                                            <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                                {scenario.categoryLabel}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            {scenario.description}
                                        </p>

                                        {/* Make風 フローノードライン */}
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-mono overflow-x-auto py-1 text-slate-700">
                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                                                <Zap className="w-3 h-3 text-amber-600" />
                                                <span className="font-semibold text-slate-800">トリガー:</span>
                                                <span className="font-sans text-slate-600 truncate max-w-[150px] sm:max-w-none">{scenario.trigger}</span>
                                            </div>

                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                                                <Clock className="w-3 h-3 text-indigo-600" />
                                                <span className="font-semibold text-slate-800">タイミング:</span>
                                                <span className="font-sans text-slate-600">{scenario.timing}</span>
                                            </div>

                                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 shrink-0">
                                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                                <span className="font-semibold text-slate-800">対象:</span>
                                                <span className="font-sans text-slate-600 truncate max-w-[120px] sm:max-w-none">{scenario.target}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 右側: アクション & スイッチコントロール */}
                                    <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                                            <span className="text-[11px] font-semibold text-slate-600">
                                                {scenario.id === 'lesson_report_feedback' ? '下書きモード' : '自動実行'}
                                            </span>
                                            <Switch
                                                checked={isActive || isDraft}
                                                onCheckedChange={() => handleQuickToggle(scenario)}
                                            />
                                            <span
                                                className={`text-[10px] font-bold ${
                                                    isActive ? 'text-emerald-600' : isDraft ? 'text-amber-600' : 'text-slate-400'
                                                }`}
                                            >
                                                {isActive ? 'ON' : isDraft ? '下書き' : 'OFF'}
                                            </span>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenEdit(scenario)}
                                            className="h-8 text-xs font-semibold border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl"
                                        >
                                            <FileEdit className="w-3.5 h-3.5 mr-1" />
                                            文面・設定を微調整
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* シナリオ設定・文面微調整モーダル */}
            <Dialog open={!!editingScenario} onOpenChange={(open) => !open && setEditingScenario(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
                    {editingScenario && (
                        <>
                            <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="p-1 rounded bg-indigo-600 text-white">
                                        <FileEdit className="w-4 h-4" />
                                    </span>
                                    <DialogTitle className="text-base font-bold text-slate-900">
                                        「{editingScenario.name}」の微調整
                                    </DialogTitle>
                                </div>
                                <DialogDescription className="text-xs text-slate-500">
                                    配信ステータス、メッセージテンプレート、各種変数の挿入、およびテスト送信を行えます。
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-2">
                                {/* ステータス切り替え設定 */}
                                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                    <label className="text-xs font-bold text-slate-800">
                                        実行ステータス
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {editingScenario.id === 'lesson_report_feedback' ? (
                                            <div className="space-y-2 w-full">
                                                <div className="grid grid-cols-3 gap-2 w-full text-xs">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormStatus('draft');
                                                            setFormFeedbackMode('draft');
                                                        }}
                                                        className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                                            formFeedbackMode === 'draft'
                                                                ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        📝 シナリオ下書き (準備中)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormStatus('active');
                                                            setFormFeedbackMode('auto_send');
                                                        }}
                                                        className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                                            formFeedbackMode === 'auto_send'
                                                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        🚀 稼働中 (自動送信開始)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormStatus('paused');
                                                            setFormFeedbackMode('disabled');
                                                        }}
                                                        className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                                                            formFeedbackMode === 'disabled'
                                                                ? 'bg-slate-600 text-white border-slate-700 shadow-2xs'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        ⏸ 一時停止 (OFF)
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-slate-500">
                                                    {formFeedbackMode === 'draft' && '※「シナリオ下書き」状態です。コーチが報告を提出しても生徒へのLINE送信やチャット記録は一切行われません。'}
                                                    {formFeedbackMode === 'auto_send' && '※「稼働中」です。コーチが報告を提出すると、生徒の公式LINEへフィードバックメッセージが自動送信されます。'}
                                                    {formFeedbackMode === 'disabled' && '※「一時停止」です。送信処理は完全にスキップされます。'}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 text-xs font-semibold">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="scenario_status"
                                                        value="active"
                                                        checked={formStatus === 'active'}
                                                        onChange={() => setFormStatus('active')}
                                                        className="text-emerald-600"
                                                    />
                                                    <span>稼働中 (自動実行)</span>
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="scenario_status"
                                                        value="paused"
                                                        checked={formStatus === 'paused'}
                                                        onChange={() => setFormStatus('paused')}
                                                        className="text-slate-600"
                                                    />
                                                    <span>一時停止 (停止中)</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 体験後フォロー固有: Google Chat通知先設定 */}
                                {editingScenario.id === 'trial_followup' && (
                                    <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5 text-xs">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                            <BellRing className="w-3.5 h-3.5 text-amber-600" />
                                            <span>LINE未連携・配信枠超過時のGoogle Chat通知Webhook URL</span>
                                        </div>
                                        <Input
                                            value={formGChatWebhook}
                                            onChange={(e) => setFormGChatWebhook(e.target.value)}
                                            placeholder="https://chat.googleapis.com/... (空欄で登録済み公式ライングループを自動利用)"
                                            className="text-xs font-mono bg-white border-amber-200 rounded-lg h-8"
                                        />
                                    </div>
                                )}

                                {/* メッセージテンプレートエディタ */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <span>送信メッセージテンプレート</span>
                                        </label>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleResetDefault}
                                            className="text-[11px] h-7 text-slate-500 hover:text-slate-700"
                                        >
                                            <RotateCcw className="w-3 h-3 mr-1" />
                                            初期テンプレートに戻す
                                        </Button>
                                    </div>

                                    {/* 変数タグバッジ一覧（クリックで挿入） */}
                                    {editingScenario.variables.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px]">
                                            <span className="font-semibold text-slate-500 mr-1">挿入可能変数:</span>
                                            {editingScenario.variables.map((v) => (
                                                <button
                                                    key={v.key}
                                                    type="button"
                                                    onClick={() => handleInsertVariable(v.key)}
                                                    className="px-2 py-0.5 rounded bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 font-mono text-[10px] transition-colors cursor-pointer"
                                                    title={`例: ${v.example}`}
                                                >
                                                    +{`{{${v.key}}}`} <span className="text-slate-400 font-sans">({v.label})</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <Textarea
                                        value={formTemplate}
                                        onChange={(e) => setFormTemplate(e.target.value)}
                                        rows={12}
                                        className="font-mono text-xs leading-relaxed bg-white border-slate-200 focus:border-indigo-500 rounded-xl"
                                        placeholder="配信するメッセージ文面を入力してください..."
                                    />

                                    <div className="flex justify-end text-[11px] text-slate-400">
                                        <span>{formTemplate.length} 文字</span>
                                    </div>
                                </div>

                                {/* テスト送信結果表示 */}
                                {testResult && (
                                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1.5 animate-in fade-in">
                                        <div className="flex items-center gap-2 text-emerald-800 font-bold">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span>テスト送信完了（{testResult.timestamp}）- 送信先: {testResult.recipient}</span>
                                        </div>
                                        <div className="p-2.5 bg-white rounded-lg border border-emerald-100 text-[11px] text-slate-700 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                                            {testResult.messageText}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-slate-100">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestSend}
                                    disabled={isTesting || isSaving}
                                    className="w-full sm:w-auto h-9 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl"
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

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingScenario(null)}
                                        className="w-full sm:w-auto h-9 text-xs"
                                    >
                                        キャンセル
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={isSaving || isTesting}
                                        className="w-full sm:w-auto h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs px-5"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                                保存中...
                                            </>
                                        ) : (
                                            '設定を保存する'
                                        )}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
