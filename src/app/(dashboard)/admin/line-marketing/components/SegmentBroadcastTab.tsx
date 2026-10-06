'use client';

/**
 * セグメント一括配信メインタブコンポーネント
 * 
 * 顧客ステータス・地域・担当コーチ・受講プランによる複合抽出、リアルタイムプレビュー、
 * 個別除外チェック、変数置換メッセージエディタ、0035テスト送信、即時/予約送信を提供します。
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Users,
    Filter,
    Send,
    Smartphone,
    ShieldCheck,
    Clock,
    Sparkles,
    RefreshCw,
    Search,
    Loader2,
    Tag,
} from 'lucide-react';
import {
    SegmentFilterConditions,
    FilterPreviewStudent,
    FilterPreviewResult,
} from '@/types/line-marketing';
import {
    previewSegmentStudents,
    createBroadcastCampaign,
    sendTestPreviewMessage,
    getLineMarketingMasterData,
} from '@/actions/line-marketing';
import { PhonePreviewModal } from './PhonePreviewModal';
import { SafetyConfirmDialog } from './SafetyConfirmDialog';

export interface MasterDataProps {
    coaches: Array<{ id: string; fullName: string; baseArea: string | null }>;
    plans: Array<{ id: string; name: string }>;
    statuses: Array<{ id: string; name: string }>;
    areas: string[];
}

interface SegmentBroadcastTabProps {
    masterData?: MasterDataProps;
    initialTag?: string | null;
    onBroadcastSuccess?: () => void;
    onDeliveryDone?: () => void;
}

// 挿入可能な変数定義
const VARIABLE_CHIPS = [
    { label: '氏名', variable: '{{name}}', description: '生徒氏名' },
    { label: '担当コーチ', variable: '{{coach_name}}', description: '担当コーチ名' },
    { label: 'プラン名', variable: '{{plan_name}}', description: '受講プラン名' },
    { label: '体験レッスン日', variable: '{{trial_date}}', description: '体験日' },
    { label: 'エリア', variable: '{{area}}', description: '希望エリア' },
    { label: '会員番号', variable: '{{student_number}}', description: '会員番号' },
    { label: '体験予約URL', variable: '{{trial_url}}', description: '予約ページURL' },
];

export const SegmentBroadcastTab: React.FC<SegmentBroadcastTabProps> = ({
    masterData: initialMasterData,
    initialTag,
    onBroadcastSuccess,
    onDeliveryDone,
}) => {
    // -------------------------------------------------------------
    // 0. マスタデータ管理
    // -------------------------------------------------------------
    const [masterData, setMasterData] = useState<MasterDataProps>(
        initialMasterData || {
            coaches: [],
            plans: [],
            statuses: [],
            areas: ['東京都', '千葉県', '神奈川県', '目黒区', '港区', '品川区', '世田谷区'],
        }
    );

    useEffect(() => {
        if (!initialMasterData) {
            getLineMarketingMasterData().then(data => {
                if (data) setMasterData(data);
            }).catch(e => console.error('[SegmentBroadcastTab] Master data load error:', e));
        } else {
            setMasterData(initialMasterData);
        }
    }, [initialMasterData]);

    // -------------------------------------------------------------
    // 1. フィルター状態
    // -------------------------------------------------------------
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [selectedCoachId, setSelectedCoachId] = useState<string>('all');
    const [selectedPlanId, setSelectedPlanId] = useState<string>('all');
    const [selectedTag, setSelectedTag] = useState<string>(initialTag || 'all');
    const [viewedNotAppliedOnly, setViewedNotAppliedOnly] = useState<boolean>(false);
    const [lineLinkedOnly, setLineLinkedOnly] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // initialTagの変更を監視
    useEffect(() => {
        if (initialTag) {
            setSelectedTag(initialTag);
            if (initialTag === 'trial_form_viewed') {
                setViewedNotAppliedOnly(true);
            }
        }
    }, [initialTag]);

    // -------------------------------------------------------------
    // 2. プレビュー抽出データ & 個別除外状態
    // -------------------------------------------------------------
    const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
    const [previewResult, setPreviewResult] = useState<FilterPreviewResult | null>(null);
    const [excludedStudentIds, setExcludedStudentIds] = useState<Set<string>>(new Set());

    // -------------------------------------------------------------
    // 3. メッセージ作成フォーム状態
    // -------------------------------------------------------------
    const [campaignTitle, setCampaignTitle] = useState<string>('');
    const [messageTemplate, setMessageTemplate] = useState<string>(
        '{{name}} 様\n\nスイムパートナーズの {{coach_name}} です。\nいつもレッスンへのご参加ありがとうございます！\n\n現在、{{plan_name}} をご利用の皆様に向けて特別なご案内をお届けしております。'
    );
    const [deliveryMode, setDeliveryMode] = useState<'instant' | 'scheduled'>('instant');
    const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // -------------------------------------------------------------
    // 4. ダイアログ・送信ローディング状態
    // -------------------------------------------------------------
    const [isPhonePreviewOpen, setIsPhonePreviewOpen] = useState<boolean>(false);
    const [isSafetyDialogOpen, setIsSafetyDialogOpen] = useState<boolean>(false);
    const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
    const [isSubmittingBroadcast, setIsSubmittingBroadcast] = useState<boolean>(false);
    const [previewTargetStudent, setPreviewTargetStudent] = useState<FilterPreviewStudent | null>(null);

    // -------------------------------------------------------------
    // 5. リアルタイム生徒プレビュー抽出 (デバウンス対応)
    // -------------------------------------------------------------
    const fetchStudentsPreview = useCallback(async () => {
        setIsLoadingPreview(true);
        try {
            const filter: SegmentFilterConditions = {
                statuses: selectedStatus !== 'all' ? [selectedStatus] : undefined,
                areas: selectedArea !== 'all' ? [selectedArea] : undefined,
                coachIds: selectedCoachId !== 'all' ? [selectedCoachId] : undefined,
                membershipTypeIds: selectedPlanId !== 'all' ? [selectedPlanId] : undefined,
                includeTags: selectedTag !== 'all' ? [selectedTag] : undefined,
                viewedFormNotApplied: viewedNotAppliedOnly,
                lineLinkedOnly,
                searchQuery: searchQuery.trim() || undefined,
            };

            const result = await previewSegmentStudents(filter);
            if (result.success) {
                setPreviewResult(result);
                // 抽出条件変更時、存在しない除外IDをクリーンアップ
                setExcludedStudentIds(prev => {
                    const next = new Set<string>();
                    const availableIds = new Set(result.students.map(s => s.id));
                    prev.forEach(id => {
                        if (availableIds.has(id)) next.add(id);
                    });
                    return next;
                });
            } else {
                toast.error('対象生徒の抽出プレビューに失敗しました: ' + (result.error || ''));
            }
        } catch (err: any) {
            toast.error('エラーが発生しました: ' + err.message);
        } finally {
            setIsLoadingPreview(false);
        }
    }, [selectedStatus, selectedArea, selectedCoachId, selectedPlanId, selectedTag, viewedNotAppliedOnly, lineLinkedOnly, searchQuery]);

    // 条件変更時のデバウンスフェッチ
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudentsPreview();
        }, 350);
        return () => clearTimeout(timer);
    }, [fetchStudentsPreview]);

    // -------------------------------------------------------------
    // 6. 計算プロパティ（送信対象生徒・除外判定）
    // -------------------------------------------------------------
    const allStudents = previewResult?.students || [];
    // LINE連携済みかつ未除外の生徒が実送信対象
    const targetStudents = allStudents.filter(s => s.hasLine && !excludedStudentIds.has(s.id));
    const targetCount = targetStudents.length;

    // 個別除外トグル
    const toggleExcludeStudent = (studentId: string) => {
        setExcludedStudentIds(prev => {
            const next = new Set(prev);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    // 一括全選択 / 全解除
    const handleToggleAll = () => {
        const lineEligibleStudents = allStudents.filter(s => s.hasLine);
        if (targetCount === lineEligibleStudents.length) {
            // 全て除外
            setExcludedStudentIds(new Set(lineEligibleStudents.map(s => s.id)));
        } else {
            // 全て選択（除外クリア）
            setExcludedStudentIds(new Set());
        }
    };

    // -------------------------------------------------------------
    // 7. 変数チップ挿入ハンドラー
    // -------------------------------------------------------------
    const handleInsertVariable = (variableText: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setMessageTemplate(prev => prev + variableText);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const currentVal = textarea.value;
        const updatedVal = currentVal.substring(0, start) + variableText + currentVal.substring(end);

        setMessageTemplate(updatedVal);

        // カーソルを挿入した変数の直後に戻す
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variableText.length, start + variableText.length);
        }, 10);
    };

    // -------------------------------------------------------------
    // 8. テスト太郎（会員番号0035）限定テスト送信
    // -------------------------------------------------------------
    const handleSendTestMessage = async () => {
        if (!messageTemplate.trim()) {
            toast.warning('メッセージ本文を入力してください。');
            return;
        }
        if (messageTemplate.length > 5000) {
            toast.error('メッセージは5,000文字以内で入力してください');
            return;
        }

        setIsSendingTest(true);
        try {
            const res = await sendTestPreviewMessage(messageTemplate);
            if (res.success) {
                toast.success('テスト太郎（会員番号0035）宛てにテスト送信が完了しました！LINEアプリをご確認ください。');
                if (onDeliveryDone) onDeliveryDone();
            } else {
                toast.error('テスト送信に失敗しました: ' + (res.error || '不明なエラー'));
            }
        } catch (err: any) {
            toast.error('テスト送信エラー: ' + err.message);
        } finally {
            setIsSendingTest(false);
        }
    };

    // -------------------------------------------------------------
    // 9. 一括配信バリデーション & 確認ダイアログ起動
    // -------------------------------------------------------------
    const handleOpenSafetyDialog = () => {
        if (!campaignTitle.trim()) {
            toast.warning('キャンペーンタイトルを入力してください。');
            return;
        }
        if (!messageTemplate.trim()) {
            toast.warning('メッセージ本文を入力してください。');
            return;
        }
        if (messageTemplate.length > 5000) {
            toast.error('メッセージが上限の5,000文字を超えています。短縮してください。');
            return;
        }
        if (targetCount === 0) {
            toast.warning('配信対象となるLINE連携済みの生徒が存在しません。抽出条件をご確認ください。');
            return;
        }
        if (deliveryMode === 'scheduled') {
            if (!scheduledDateTime) {
                toast.warning('予約配信日時を指定してください。');
                return;
            }
            if (new Date(scheduledDateTime) <= new Date()) {
                toast.warning('予約日時は現在時刻より後の日時を指定してください。');
                return;
            }
        }

        setIsSafetyDialogOpen(true);
    };

    // -------------------------------------------------------------
    // 10. 一括配信・予約実行
    // -------------------------------------------------------------
    const handleExecuteBroadcast = async () => {
        setIsSubmittingBroadcast(true);
        try {
            const filterConditions: SegmentFilterConditions = {
                statuses: selectedStatus !== 'all' ? [selectedStatus] : undefined,
                areas: selectedArea !== 'all' ? [selectedArea] : undefined,
                coachIds: selectedCoachId !== 'all' ? [selectedCoachId] : undefined,
                membershipTypeIds: selectedPlanId !== 'all' ? [selectedPlanId] : undefined,
                includeTags: selectedTag !== 'all' ? [selectedTag] : undefined,
                viewedFormNotApplied: viewedNotAppliedOnly,
                lineLinkedOnly,
                searchQuery: searchQuery.trim() || undefined,
            };

            const res = await createBroadcastCampaign({
                title: campaignTitle.trim(),
                messageTemplate: messageTemplate.trim(),
                filterConditions,
                scheduledAt: deliveryMode === 'scheduled' ? new Date(scheduledDateTime).toISOString() : null,
                excludedStudentIds: Array.from(excludedStudentIds),
            });

            if (res.success) {
                setIsSafetyDialogOpen(false);
                if (res.status === 'scheduled') {
                    toast.success(`一括配信を予約しました（対象: ${res.targetCount}名）`);
                } else {
                    toast.success(`一括配信が完了しました！（成功: ${res.successCount}件, 失敗: ${res.failedCount}件）`);
                }
                // 成功時コールバック
                if (onBroadcastSuccess) onBroadcastSuccess();
                if (onDeliveryDone) onDeliveryDone();
                // 送信完了後に一覧を再フェッチ
                fetchStudentsPreview();
            } else {
                toast.error('一括配信の登録に失敗しました: ' + (res.error || ''));
            }
        } catch (err: any) {
            toast.error('配信実行エラー: ' + err.message);
        } finally {
            setIsSubmittingBroadcast(false);
        }
    };

    // タグ別おすすめメッセージテンプレート
    const TAG_PRESETS: Record<string, { title: string; body: string }> = {
        trial_done: {
            title: '【体験受講後】レッスンご参加のお礼と特別入会キャンペーンのご案内',
            body: '{{name}} 様\n\nスイムパートナーズの {{coach_name}} です。\n先日は体験レッスンへのご参加、誠にありがとうございました！\n\n水泳の楽しさや上達の感触はいかがでしたでしょうか？\n\n現在、体験レッスン受講後の生徒様限定で【入会金無料＆初回受講特典】キャンペーンを実施しております。\n定期的なマンツーマン個別指導でさらにスムーズに楽しく泳げるよう全力で伴走いたします。\n\nご質問やご相談がございましたら、いつでもこのLINEでお気軽にご返信ください！'
        },
        trial_form_viewed: {
            title: '【ご案内】体験レッスンのお申し込み・日程相談について',
            body: '{{name}} 様\n\nスイムパートナーズ事務局です。\n公式LINEをご覧いただきありがとうございます！\n\n体験レッスンのお申し込みフォームはご確認いただけましたでしょうか？\n\n「日程が合うか不安」「どのコーチが良いかわからない」「まずは質問だけしたい」などございましたら、このLINEチャットで専任スタッフが直接ご相談に乗らせていただきます。\n\n▼ 体験レッスン日程のご確認・お申し込みはこちら\n{{trial_url}}'
        },
        friend_only: {
            title: '【公式LINE】スイムパートナーズのご案内と体験レッスン',
            body: '{{name}} 様\n\n友だち追加ありがとうございます！\n水泳の出張マンツーマン個別指導【スイムパートナーズ】です。\n\nお子様から大人・マスターズまで、お近くの公営・民間プールでプロコーチが1対1で優しく指導いたします。\n\nまずは手軽に受けられる「体験レッスン」からぜひお試しください！\n▼ 体験レッスンの詳細・お申し込みはこちら\n{{trial_url}}'
        },
        referral_lead: {
            title: '【お友達紹介特典】特別優待レッスンのご案内',
            body: '{{name}} 様\n\nスイムパートナーズです。\nご紹介者様経由でのご登録ありがとうございます！\n\nお友達紹介キャンペーンとして、体験レッスンが通常価格よりお得な【特別優待価格】でご受講いただけます。\n\nぜひこの機会にお気軽にご体験ください！\n▼ お申し込みはこちら\n{{trial_url}}'
        },
    };

    const handleSelectQuickTag = (tag: string) => {
        setSelectedTag(tag);
        if (tag === 'trial_form_viewed') {
            setViewedNotAppliedOnly(true);
        } else {
            setViewedNotAppliedOnly(false);
        }
        if (TAG_PRESETS[tag]) {
            setCampaignTitle(TAG_PRESETS[tag].title);
            setMessageTemplate(TAG_PRESETS[tag].body);
            toast.info(`タグ別一斉配信テンプレートを反映しました`);
        }
    };

    return (
        <div className="space-y-6">
            {/* 上部: 複合条件絞り込みパネル */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <CardTitle className="text-base font-bold">セグメント抽出条件（複合絞り込み・タグ別一斉配信）</CardTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchStudentsPreview}
                            disabled={isLoadingPreview}
                            className="text-xs text-slate-600 hover:text-slate-900"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoadingPreview ? 'animate-spin' : ''}`} />
                            最新に更新
                        </Button>
                    </div>
                    <CardDescription className="text-xs">
                        タグ、顧客ステータス、地域、担当コーチ、受講プランを掛け合わせて配信対象者を瞬時に特定し、一斉配信できます。
                    </CardDescription>

                    {/* 🏷️ タグ別クイック一斉配信セレクターバー */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1 flex items-center gap-1">
                                <Tag className="h-3 w-3 text-indigo-500" />
                                タグ別クイック一斉配信:
                            </span>
                            <button
                                type="button"
                                onClick={() => handleSelectQuickTag('all')}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                                    selectedTag === 'all'
                                        ? 'bg-slate-900 text-white shadow-xs font-bold'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                全生徒（条件指定なし）
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectQuickTag('trial_done')}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
                                    selectedTag === 'trial_done'
                                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                                }`}
                            >
                                🏊‍♂️ 体験受講後
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectQuickTag('trial_form_viewed')}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
                                    selectedTag === 'trial_form_viewed'
                                        ? 'bg-amber-600 text-white shadow-xs font-bold'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                                }`}
                            >
                                ⚡ フォーム閲覧・未申込
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectQuickTag('friend_only')}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
                                    selectedTag === 'friend_only'
                                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                                }`}
                            >
                                💬 友だち追加のみ
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSelectQuickTag('referral_lead')}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 ${
                                    selectedTag === 'referral_lead'
                                        ? 'bg-purple-600 text-white shadow-xs font-bold'
                                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
                                }`}
                            >
                                🎁 お友達紹介
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {/* 1. タグ指定 */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                <Tag className="h-3.5 w-3.5 text-indigo-500" />
                                配信対象タグ
                            </Label>
                            <Select value={selectedTag} onValueChange={handleSelectQuickTag}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="すべてのタグ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのタグ</SelectItem>
                                    <SelectItem value="trial_done">🏊‍♂️ 体験受講後</SelectItem>
                                    <SelectItem value="trial_form_viewed">⚡ 体験フォーム閲覧未申込</SelectItem>
                                    <SelectItem value="friend_only">💬 友だち追加のみ</SelectItem>
                                    <SelectItem value="referral_lead">🎁 お友達紹介経由</SelectItem>
                                    <SelectItem value="trial_applied">📝 体験申込完了</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. ステータス */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                顧客ステータス
                            </Label>
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="すべてのステータス" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのステータス</SelectItem>
                                    {masterData.statuses.map(st => (
                                        <SelectItem key={st.id} value={st.id}>
                                            {st.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 3. エリア */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                対象エリア・地域
                            </Label>
                            <Select value={selectedArea} onValueChange={setSelectedArea}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="すべてのエリア" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのエリア</SelectItem>
                                    {masterData.areas.map(area => (
                                        <SelectItem key={area} value={area}>
                                            {area}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 4. 担当コーチ */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                担当コーチ
                            </Label>
                            <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="すべてのコーチ" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのコーチ</SelectItem>
                                    {masterData.coaches.map(coach => (
                                        <SelectItem key={coach.id} value={coach.id}>
                                            {coach.fullName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 5. 受講プラン */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                受講プラン
                            </Label>
                            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="すべてのプラン" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">すべてのプラン</SelectItem>
                                    {masterData.plans.map(plan => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                            {plan.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* キーワード検索 & LINE連携スイッチ & 離脱者フィルター */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input
                                placeholder="生徒氏名、カナ、会員番号（例: 0035）で絞り込み..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <Switch
                                    checked={viewedNotAppliedOnly}
                                    onCheckedChange={setViewedNotAppliedOnly}
                                    className="data-[state=checked]:bg-amber-600"
                                />
                                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                    ⚡ フォーム閲覧・未申込者のみ（離脱フォロー）
                                </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <Switch
                                    checked={lineLinkedOnly}
                                    onCheckedChange={setLineLinkedOnly}
                                    className="data-[state=checked]:bg-emerald-600"
                                />
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    LINE連携済のみ
                                </span>
                            </label>

                            {(selectedStatus !== 'all' || selectedArea !== 'all' || selectedCoachId !== 'all' || selectedPlanId !== 'all' || selectedTag !== 'all' || viewedNotAppliedOnly || searchQuery !== '') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedStatus('all');
                                        setSelectedArea('all');
                                        setSelectedCoachId('all');
                                        setSelectedPlanId('all');
                                        setSelectedTag('all');
                                        setViewedNotAppliedOnly(false);
                                        setSearchQuery('');
                                    }}
                                    className="h-8 text-xs text-slate-500 hover:text-slate-700"
                                >
                                    リセット
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 中段: リアルタイム対象者プレビューUI & 個別除外テーブル */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <CardTitle className="text-base font-bold">配信対象者プレビュー</CardTitle>
                            </div>
                            <CardDescription className="text-xs mt-0.5">
                                チェックを外すことで特定の生徒を今回の配信から除外できます。
                            </CardDescription>
                        </div>

                        {/* 件数サマリーバッジ */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800">
                                抽出総数: <span className="font-bold ml-1">{allStudents.length}</span> 名
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200">
                                LINE連携済: <span className="font-bold ml-1">{previewResult?.lineEligibleCount || 0}</span> 名
                            </Badge>
                            {excludedStudentIds.size > 0 && (
                                <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                                    除外: <span className="font-bold ml-1">{excludedStudentIds.size}</span> 名
                                </Badge>
                            )}
                            <Badge className="text-xs bg-emerald-600 text-white font-bold">
                                最終送信対象: {targetCount} 名
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <div className="max-h-72 overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-12 text-center">
                                            <Checkbox
                                                checked={targetCount > 0 && targetCount === allStudents.filter(s => s.hasLine).length}
                                                onCheckedChange={handleToggleAll}
                                                aria-label="全選択/解除"
                                            />
                                        </TableHead>
                                        <TableHead className="w-24 text-xs">会員番号</TableHead>
                                        <TableHead className="text-xs">氏名</TableHead>
                                        <TableHead className="text-xs">ステータス</TableHead>
                                        <TableHead className="text-xs">エリア</TableHead>
                                        <TableHead className="text-xs">担当コーチ</TableHead>
                                        <TableHead className="text-xs">プラン</TableHead>
                                        <TableHead className="w-24 text-xs text-center">LINE連携</TableHead>
                                        <TableHead className="w-24 text-xs text-right">プレビュー</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingPreview ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                                                    生徒データを抽出中...
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : allStudents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="h-32 text-center text-xs text-slate-500">
                                                該当する生徒が見つかりませんでした。条件を変更してください。
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        allStudents.map(student => {
                                            const isExcluded = excludedStudentIds.has(student.id);
                                            const isEligible = student.hasLine;
                                            const isSelected = isEligible && !isExcluded;

                                            return (
                                                <TableRow
                                                    key={student.id}
                                                    className={!isEligible ? 'opacity-50 bg-slate-50/50' : isExcluded ? 'bg-amber-50/30' : ''}
                                                >
                                                    <TableCell className="text-center">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            disabled={!isEligible}
                                                            onCheckedChange={() => toggleExcludeStudent(student.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs font-semibold">
                                                        {student.studentNumber}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <span className="font-medium text-slate-900 dark:text-slate-100">
                                                            {student.fullName}
                                                        </span>
                                                        {student.fullNameKana && (
                                                            <span className="block text-[10px] text-slate-400">
                                                                {student.fullNameKana}
                                                            </span>
                                                        )}
                                                        {student.tags && student.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {student.tags.map(t => (
                                                                    <span key={t} className="inline-block text-[9px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-1 rounded border border-slate-200 dark:border-slate-700">
                                                                        #{t === 'trial_form_viewed' ? 'フォーム閲覧' : t === 'trial_applied' ? '申込済' : t === 'referral_lead' ? '紹介' : t}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                            {student.statusLabel}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {student.area}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {student.coachName || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {student.planName || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {student.hasLine ? (
                                                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] border-emerald-300">
                                                                連携済
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px] text-slate-400">
                                                                未連携
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setPreviewTargetStudent(student);
                                                                setIsPhonePreviewOpen(true);
                                                            }}
                                                            className="h-7 px-2 text-[11px] text-slate-600 hover:text-emerald-600"
                                                        >
                                                            確認
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 下段: メッセージ編集 & 変数置換UI */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <CardTitle className="text-base font-bold">メッセージ作成 & 配信設定</CardTitle>
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                            文字数: <span className={messageTemplate.length > 5000 ? 'text-rose-600 font-bold' : 'text-slate-800 font-bold'}>{messageTemplate.length}</span> / 5,000文字
                        </div>
                    </div>
                    <CardDescription className="text-xs">
                        変数チップをクリックするとカーソル位置に自動挿入されます。送信時に生徒ごとの属性値に自動変換されます。
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                    {/* キャンペーンタイトル */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            キャンペーン管理タイトル <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                            placeholder="例: 【重要案内】10月度ステップアップ受講キャンペーン"
                            value={campaignTitle}
                            onChange={e => setCampaignTitle(e.target.value)}
                            className="h-9 text-xs"
                        />
                    </div>

                    {/* 変数チップ一覧 */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                挿入可能な変数チップ（クリックで挿入）:
                            </Label>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {VARIABLE_CHIPS.map(chip => (
                                <Button
                                    key={chip.variable}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleInsertVariable(chip.variable)}
                                    className="h-7 text-xs bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 dark:bg-slate-800 dark:hover:bg-slate-700"
                                    title={chip.description}
                                >
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold mr-1">
                                        {chip.variable}
                                    </span>
                                    <span className="text-[11px] text-slate-500">{chip.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* メッセージ本文テキストエリア */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            配信本文 <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            ref={textareaRef}
                            value={messageTemplate}
                            onChange={e => setMessageTemplate(e.target.value)}
                            placeholder="LINEメッセージ本文を入力..."
                            rows={8}
                            className="text-xs font-sans leading-relaxed resize-y border-slate-300 focus-visible:ring-emerald-500"
                        />
                    </div>

                    {/* 送信モード（即時 vs 日時指定予約） */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">送信タイミング:</span>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                    <input
                                        type="radio"
                                        name="deliveryMode"
                                        checked={deliveryMode === 'instant'}
                                        onChange={() => setDeliveryMode('instant')}
                                        className="text-emerald-600"
                                    />
                                    <span>今すぐ送信（即時配信）</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                    <input
                                        type="radio"
                                        name="deliveryMode"
                                        checked={deliveryMode === 'scheduled'}
                                        onChange={() => setDeliveryMode('scheduled')}
                                        className="text-blue-600"
                                    />
                                    <span>日時指定予約</span>
                                </label>
                            </div>
                        </div>

                        {deliveryMode === 'scheduled' && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                                <Input
                                    type="datetime-local"
                                    value={scheduledDateTime}
                                    onChange={e => setScheduledDateTime(e.target.value)}
                                    className="h-8 text-xs w-48"
                                />
                            </div>
                        )}
                    </div>

                    {/* アクションボタンバー */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        {/* 左側: テスト送信 & 実機プレビュー */}
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setPreviewTargetStudent(targetStudents[0] || null);
                                    setIsPhonePreviewOpen(true);
                                }}
                                className="text-xs border-slate-300"
                            >
                                <Smartphone className="w-4 h-4 mr-1.5 text-emerald-600" />
                                実機風プレビュー
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSendTestMessage}
                                disabled={isSendingTest}
                                className="text-xs bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                                title="会員番号0035（テスト太郎）宛てにテスト送信します"
                            >
                                {isSendingTest ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        テスト送信中...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
                                        テスト太郎（0035）にテスト送信
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* 右側: 配信確認へ進む */}
                        <Button
                            type="button"
                            onClick={handleOpenSafetyDialog}
                            disabled={targetCount === 0}
                            className={
                                deliveryMode === 'instant'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 shadow-xs'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-5 shadow-xs'
                            }
                        >
                            <Send className="w-4 h-4 mr-2" />
                            {deliveryMode === 'instant'
                                ? `配信内容を確認する（対象: ${targetCount}名）`
                                : `予約内容を確認する（対象: ${targetCount}名）`}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* スマホ実機風トーク画面プレビューモーダル */}
            <PhonePreviewModal
                isOpen={isPhonePreviewOpen}
                onClose={() => setIsPhonePreviewOpen(false)}
                template={messageTemplate}
                students={allStudents}
                initialStudent={previewTargetStudent}
            />

            {/* 誤送信防止2段階確認モーダル */}
            <SafetyConfirmDialog
                isOpen={isSafetyDialogOpen}
                onClose={() => setIsSafetyDialogOpen(false)}
                onConfirm={handleExecuteBroadcast}
                isSubmitting={isSubmittingBroadcast}
                title={campaignTitle}
                messageTemplate={messageTemplate}
                targetCount={targetCount}
                deliveryMode={deliveryMode}
                scheduledAt={scheduledDateTime}
                sampleStudent={targetStudents[0] || null}
            />
        </div>
    );
};
