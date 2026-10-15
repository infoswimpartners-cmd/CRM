'use client';

/**
 * セグメント一括配信メインタブコンポーネント
 * 
 * 顧客ステータス・地域・担当コーチ・受講プランによる複合抽出、リアルタイムプレビュー、
 * 個別除外チェック、変数置換メッセージエディタ、0035テスト送信、即時/予約送信を提供します。
 * 
 * サブコンポーネント群:
 * - SegmentKpiCards: リアルタイムKPIダッシュボード
 * - SegmentFilterAccordion: クイック選択 & 折りたたみ式詳細フィルター
 * - SegmentStudentDataGrid: デスクトップテーブル & モバイルカード型データグリッド
 * - SegmentMessageEditor: 変数チップ & リアルタイムLINEスマホプレビューエディタ
 * - SafetyConfirmDialog: 抽出条件サマリー付き2段階誤送信防止確認ダイアログ
 * - PhonePreviewModal / ScheduledCampaignsModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
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
import { SegmentKpiCards } from './SegmentKpiCards';
import { SegmentFilterAccordion } from './SegmentFilterAccordion';
import { SegmentStudentDataGrid } from './SegmentStudentDataGrid';
import { SegmentMessageEditor } from './SegmentMessageEditor';
import { PhonePreviewModal } from './PhonePreviewModal';
import { SafetyConfirmDialog } from './SafetyConfirmDialog';
import { ScheduledCampaignsModal } from './ScheduledCampaignsModal';
import { formatErrorToastMessage, sanitizeErrorMessage } from '@/lib/error-formatter';

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

// 初期デフォルトメッセージ
const DEFAULT_MESSAGE =
    '{{name}} 様\n\nスイムパートナーズの {{coach_name}} です。\nいつもレッスンへのご参加ありがとうございます！\n\n現在、{{plan_name}} をご利用の皆様に向けて特別なご案内をお届けしております。';

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

// 📍 エリア別おすすめ配信テンプレート定義
const AREA_PRESETS: Record<string, { title: string; body: string }> = {
    '東京都': {
        title: '【東京都エリア】都内温水プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n東京都内の各施設（港区・品川区・渋谷区・目黒区・世田谷区など）にて、冬でも快適に泳げる温水プールでのマンツーマン個別指導を実施しております。\n\nお近くのプールでご希望の日時に合わせてコーチを派遣可能です。\nぜひお気軽に体験レッスン・継続レッスンをご相談ください！\n\n▼ 体験レッスンの詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '神奈川県': {
        title: '【神奈川・横浜・川崎エリア】近隣プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n神奈川県内（横浜市・川崎市など）の温水プール施設にて、専属コーチによるマンツーマン個別水泳レッスンをご案内しております。\n\nお子様の泳力アップから大人のフォーム改善まで、お客様の目的に合わせて丁寧にサポートいたします。\n\n▼ レッスンの詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '千葉県': {
        title: '【千葉・船橋・市川・柏エリア】近隣プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n千葉エリア（船橋市・市川市・柏市など）の温水プールにて、個人指導水泳レッスンの枠を受付中です。\n\nご自宅近くの使い慣れたプールや公営プールで集中して上達していただけます。\n\n▼ 詳細・体験お申し込みはこちら\n{{trial_url}}'
    },
    '埼玉県': {
        title: '【埼玉エリア】温水プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n埼玉エリア（さいたま市・川口市など）の温水プールにて、プロコーチによる個別レッスンのご案内です。\n\n初心者の方からタイム向上を目指す方まで、マンツーマンで着実にステップアップできます。\n\n▼ 詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '港区・品川区': {
        title: '【港区・品川区エリア】近隣温水プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n港区・品川区エリア周辺のプールにて、個別水泳レッスンを実施しております。\n\n施設選定や日時もお気軽にご相談いただけます。\n\n▼ 詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '渋谷・目黒': {
        title: '【渋谷・目黒エリア】近隣温水プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n渋谷・目黒エリア周辺の温水プールにて、マンツーマン個別指導レッスンを受け付けております。\n\n▼ 詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '世田谷・杉並': {
        title: '【世田谷・杉並エリア】近隣温水プールでの個別レッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n世田谷・杉並エリアの温水プールにて、個別水泳レッスンのご案内です。\n\n▼ 詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '横浜市': {
        title: '【横浜エリア】横浜市内プールでのマンツーマンレッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n横浜市内の温水プールにて、個別指導水泳レッスンを実施しております。\n\n▼ 詳細・お申し込みはこちら\n{{trial_url}}'
    },
    '船橋市': {
        title: '【船橋エリア】船橋市内プールでのマンツーマンレッスンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズです。\n\n船橋市内の温水プール（船橋アリーナやメグスパ等）にて、個別指導水泳レッスンを受け付けております。\n\n▼ 詳細・お申し込みはこちら\n{{trial_url}}'
    },
};

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
    const [messageTemplate, setMessageTemplate] = useState<string>(DEFAULT_MESSAGE);
    const [deliveryMode, setDeliveryMode] = useState<'instant' | 'scheduled'>('instant');
    const [scheduledDateTime, setScheduledDateTime] = useState<string>('');

    // カスタム入力が存在するか（破壊的上書き防止用フラグ）
    const hasCustomMessageInput = useMemo(() => {
        const trimmed = messageTemplate.trim();
        return trimmed.length > 0 && trimmed !== DEFAULT_MESSAGE.trim();
    }, [messageTemplate]);

    // -------------------------------------------------------------
    // 4. ダイアログ・送信ローディング状態
    // -------------------------------------------------------------
    const [isPhonePreviewOpen, setIsPhonePreviewOpen] = useState<boolean>(false);
    const [isSafetyDialogOpen, setIsSafetyDialogOpen] = useState<boolean>(false);
    const [isScheduledCampaignsOpen, setIsScheduledCampaignsOpen] = useState<boolean>(false);
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
                toast.error('対象生徒の抽出プレビューに失敗しました: ' + sanitizeErrorMessage(result.error));
            }
        } catch (err: any) {
            toast.error(formatErrorToastMessage(err));
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
    // 6. 計算プロパティ（送信対象生徒・除外判定・アクティブ件数）
    // -------------------------------------------------------------
    const allStudents = previewResult?.students || [];
    const lineEligibleStudents = allStudents.filter(s => s.hasLine);
    // LINE連携済みかつ未除外の生徒が実送信対象
    const targetStudents = allStudents.filter(s => s.hasLine && !excludedStudentIds.has(s.id));
    const targetCount = targetStudents.length;

    // アクティブな条件数カウント
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedStatus !== 'all') count++;
        if (selectedArea !== 'all') count++;
        if (selectedCoachId !== 'all') count++;
        if (selectedPlanId !== 'all') count++;
        if (selectedTag !== 'all') count++;
        if (viewedNotAppliedOnly) count++;
        if (!lineLinkedOnly) count++;
        if (searchQuery.trim().length > 0) count++;
        return count;
    }, [selectedStatus, selectedArea, selectedCoachId, selectedPlanId, selectedTag, viewedNotAppliedOnly, lineLinkedOnly, searchQuery]);

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
        if (targetCount === lineEligibleStudents.length) {
            // 全て除外
            setExcludedStudentIds(new Set(lineEligibleStudents.map(s => s.id)));
        } else {
            // 全て選択（除外クリア）
            setExcludedStudentIds(new Set());
        }
    };

    // フィルターリセット
    const handleResetFilters = () => {
        setSelectedStatus('all');
        setSelectedArea('all');
        setSelectedCoachId('all');
        setSelectedPlanId('all');
        setSelectedTag('all');
        setViewedNotAppliedOnly(false);
        setLineLinkedOnly(true);
        setSearchQuery('');
        setExcludedStudentIds(new Set());
        toast.info('絞り込み条件を初期状態にリセットしました');
    };

    // プリセットタグ適用
    const handleApplyPresetTag = (tag: string, template?: { title: string; message?: string; body?: string }) => {
        setSelectedTag(tag);
        if (tag === 'trial_form_viewed') {
            setViewedNotAppliedOnly(true);
        } else {
            setViewedNotAppliedOnly(false);
        }
        if (template) {
            setCampaignTitle(template.title);
            setMessageTemplate(template.body || template.message || '');
            toast.info('タグ別おすすめテンプレートを反映しました');
        } else if (TAG_PRESETS[tag]) {
            setCampaignTitle(TAG_PRESETS[tag].title);
            setMessageTemplate(TAG_PRESETS[tag].body);
            toast.info('タグ別おすすめテンプレートを反映しました');
        }
    };

    // プリセットエリア適用
    const handleApplyPresetArea = (area: string, template?: { title: string; message?: string; body?: string }) => {
        setSelectedArea(area);
        if (template) {
            setCampaignTitle(template.title);
            setMessageTemplate(template.body || template.message || '');
            toast.info(`【${area}】エリア別テンプレートを反映しました`);
        } else if (AREA_PRESETS[area]) {
            setCampaignTitle(AREA_PRESETS[area].title);
            setMessageTemplate(AREA_PRESETS[area].body);
            toast.info(`【${area}】エリア別テンプレートを反映しました`);
        }
    };

    // -------------------------------------------------------------
    // 7. テスト太郎（会員番号0035）限定テスト送信
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
                toast.error('テスト送信に失敗しました: ' + sanitizeErrorMessage(res.error, '不明なエラー'));
            }
        } catch (err: any) {
            toast.error(formatErrorToastMessage(err, 'テスト送信エラー: '));
        } finally {
            setIsSendingTest(false);
        }
    };

    // -------------------------------------------------------------
    // 8. 一括配信バリデーション & 確認ダイアログ起動
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
    // 9. 一括配信・予約実行
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
                toast.error('一括配信の登録に失敗しました: ' + sanitizeErrorMessage(res.error));
            }
        } catch (err: any) {
            toast.error(formatErrorToastMessage(err, '配信実行エラー: '));
        } finally {
            setIsSubmittingBroadcast(false);
        }
    };

    // フィルターサマリー用ラベル計算
    const filterSummaryData = useMemo(() => {
        const coachObj = masterData.coaches.find(c => c.id === selectedCoachId);
        const planObj = masterData.plans.find(p => p.id === selectedPlanId);
        const statusObj = masterData.statuses.find(s => s.id === selectedStatus);

        return {
            tagLabel: selectedTag !== 'all' ? selectedTag : undefined,
            statusLabel: selectedStatus !== 'all' ? (statusObj?.name || selectedStatus) : undefined,
            areaLabel: selectedArea !== 'all' ? selectedArea : undefined,
            coachLabel: selectedCoachId !== 'all' ? (coachObj?.fullName || selectedCoachId) : undefined,
            planLabel: selectedPlanId !== 'all' ? (planObj?.name || selectedPlanId) : undefined,
            searchQuery: searchQuery.trim() || undefined,
            viewedNotAppliedOnly,
            lineLinkedOnly,
            excludedCount: excludedStudentIds.size > 0 ? excludedStudentIds.size : undefined,
        };
    }, [masterData, selectedStatus, selectedArea, selectedCoachId, selectedPlanId, selectedTag, viewedNotAppliedOnly, lineLinkedOnly, searchQuery, excludedStudentIds]);

    return (
        <div className="space-y-6">
            {/* 1. リアルタイムKPIダッシュボードサマリー */}
            <SegmentKpiCards
                totalCount={allStudents.length}
                lineEligibleCount={lineEligibleStudents.length}
                excludedCount={excludedStudentIds.size}
                targetCount={targetCount}
                isLoading={isLoadingPreview}
            />

            {/* 2. セグメント抽出アコーディオンフィルターパネル */}
            <SegmentFilterAccordion
                selectedStatus={selectedStatus}
                onChangeStatus={setSelectedStatus}
                selectedArea={selectedArea}
                onChangeArea={setSelectedArea}
                selectedCoachId={selectedCoachId}
                onChangeCoachId={setSelectedCoachId}
                selectedPlanId={selectedPlanId}
                onChangePlanId={setSelectedPlanId}
                selectedTag={selectedTag}
                onChangeTag={setSelectedTag}
                viewedNotAppliedOnly={viewedNotAppliedOnly}
                onToggleViewedNotAppliedOnly={setViewedNotAppliedOnly}
                lineLinkedOnly={lineLinkedOnly}
                onToggleLineLinkedOnly={setLineLinkedOnly}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                onResetFilters={handleResetFilters}
                onApplyPresetTag={handleApplyPresetTag}
                onApplyPresetArea={handleApplyPresetArea}
                hasCustomMessageInput={hasCustomMessageInput}
                coaches={masterData.coaches.map(c => ({ id: c.id, name: c.fullName }))}
                plans={masterData.plans}
                statuses={masterData.statuses}
                areas={masterData.areas}
                activeFilterCount={activeFilterCount}
                onOpenScheduledCampaigns={() => setIsScheduledCampaignsOpen(true)}
                onRefresh={fetchStudentsPreview}
                isLoading={isLoadingPreview}
            />

            {/* 3. レスポンシブ生徒データグリッド（デスクトップ: テーブル / モバイル: カードリスト） */}
            <SegmentStudentDataGrid
                students={allStudents}
                excludedStudentIds={excludedStudentIds}
                onToggleExclude={toggleExcludeStudent}
                onToggleAll={handleToggleAll}
                isLoading={isLoadingPreview}
                onOpenPhonePreview={(student) => {
                    setPreviewTargetStudent(student);
                    setIsPhonePreviewOpen(true);
                }}
            />

            {/* 4. メッセージエディタ & リアルタイムスマホプレビュー（スプリットビュー / モバイルタブ） */}
            <SegmentMessageEditor
                campaignTitle={campaignTitle}
                onChangeCampaignTitle={setCampaignTitle}
                messageTemplate={messageTemplate}
                onChangeMessageTemplate={setMessageTemplate}
                deliveryMode={deliveryMode}
                onChangeDeliveryMode={setDeliveryMode}
                scheduledDateTime={scheduledDateTime}
                onChangeScheduledDateTime={setScheduledDateTime}
                targetCount={targetCount}
                targetStudents={targetStudents}
                onOpenSafetyDialog={handleOpenSafetyDialog}
                onSendTestMessage={handleSendTestMessage}
                isSendingTest={isSendingTest}
                onOpenScheduledCampaigns={() => setIsScheduledCampaignsOpen(true)}
            />

            {/* 5. 誤送信防止2段階確認モーダル（抽出条件サマリー・冒頭抜粋プレビュー付き） */}
            <SafetyConfirmDialog
                open={isSafetyDialogOpen}
                onOpenChange={setIsSafetyDialogOpen}
                mode={deliveryMode}
                targetCount={targetCount}
                campaignTitle={campaignTitle}
                messageContent={messageTemplate}
                scheduledAt={scheduledDateTime}
                sampleStudent={targetStudents[0] || null}
                filterSummary={filterSummaryData}
                onConfirm={handleExecuteBroadcast}
                isSending={isSubmittingBroadcast}
            />

            {/* 6. スマホ実機風トーク画面プレビューモーダル（生徒テーブルの「確認」ボタンから起動） */}
            <PhonePreviewModal
                isOpen={isPhonePreviewOpen}
                onClose={() => setIsPhonePreviewOpen(false)}
                template={messageTemplate}
                students={allStudents}
                initialStudent={previewTargetStudent}
            />

            {/* 7. 配信予約・送信キャンペーン確認＆編集モーダル */}
            <ScheduledCampaignsModal
                isOpen={isScheduledCampaignsOpen}
                onClose={() => setIsScheduledCampaignsOpen(false)}
                onCampaignUpdated={() => {
                    fetchStudentsPreview();
                    if (onBroadcastSuccess) onBroadcastSuccess();
                }}
            />
        </div>
    );
};
