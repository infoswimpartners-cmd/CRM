'use client';

/**
 * セグメント抽出アコーディオンフィルターコンポーネント
 * 
 * タグ別・エリア別のクイック選択バー、5列属性セレクト、フリーワード検索、
 * 離脱フォロースイッチ、LINE連携スイッチ、リセットボタンを包含し、
 * 詳細条件をスムーズに折りたたむことでモバイルや初期表示での情報過多を解消します。
 * クイック選択時のメッセージ破壊的上書き防止ロジックおよび44pxタップターゲットを備えます。
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
    Filter,
    Search,
    Tag,
    MapPin,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Calendar,
    RefreshCw,
    SlidersHorizontal,
    Zap,
    MessageSquare,
} from 'lucide-react';

export interface SegmentFilterAccordionProps {
    selectedStatus: string;
    onChangeStatus: (val: string) => void;
    selectedArea: string;
    onChangeArea: (val: string) => void;
    selectedCoachId: string;
    onChangeCoachId: (val: string) => void;
    selectedPlanId: string;
    onChangePlanId: (val: string) => void;
    selectedTag: string;
    onChangeTag: (val: string) => void;
    viewedNotAppliedOnly: boolean;
    onToggleViewedNotAppliedOnly: (val: boolean) => void;
    lineLinkedOnly: boolean;
    onToggleLineLinkedOnly: (val: boolean) => void;
    searchQuery: string;
    onChangeSearchQuery: (val: string) => void;
    onResetFilters: () => void;
    onApplyPresetTag?: (tag: string, template?: { title: string; message?: string; body?: string }) => void;
    onApplyPresetArea?: (area: string, template?: { title: string; message?: string; body?: string }) => void;
    hasCustomMessageInput: boolean;
    coaches: Array<{ id: string; name: string }>;
    plans: Array<{ id: string; name: string }>;
    activeFilterCount: number;
    // 拡張用オプション
    statuses?: Array<{ id: string; name: string }>;
    areas?: string[];
    onOpenScheduledCampaigns?: () => void;
    onRefresh?: () => void;
    isLoading?: boolean;
}

// 🏷️ タグ別おすすめメッセージテンプレート
export const FILTER_TAG_PRESETS: Record<string, { title: string; body: string }> = {
    trial_done: {
        title: '【体験受講後】レッスンご参加のお礼と特別入会キャンペーンのご案内',
        body: '{{name}} 様\n\nスイムパートナーズの {{coach_name}} です。\n先日は体験レッスンへのご参加、誠にありがとうございました！\n\n水泳の楽しさや上達の感触はいかがでしたでしょうか？\n\n現在、体験レッスン受講後の生徒様限定で【入会金無料＆初回受講特典】キャンペーンを実施しております。\n定期的なマンツーマン個別指導でさらにスムーズに楽しく泳げるよう全力で伴走いたします。\n\nご質問やご相談がございましたら、いつでもこのLINEでお気軽にご返信ください！'
    },
    trial_form_viewed: {
        title: '【ご案内】体験レッスンのお申し込み・日程相談について',
        body: '{{name}} 様\n\nスイムパートナーズ事務局です。\n公式LINEをご覧いただきありがとうございます！\n\n体験レッスンのお申し込みフォームはご確認いただけましたでしょうか？\n\n「日程が合うか不安」「どのコーチが良いかわからない」「まずは質問だけしたい」などございましたら、このLINEチャットで専任スタッフが直接ご相談に乗らせていただきます。\n\n▼ 体験レッスン日程のご確認・お申し込みはこちら\n{{trial_url}}'
    },
    trial_form_confirmed: {
        title: '【即時フォロー】体験レッスン入力内容のご確認・お悩み相談',
        body: '{{name}} 様\n\nスイムパートナーズ事務局です🏊‍♂️\n体験レッスン予約フォームのご入力内容をご確認いただきありがとうございます！\n\n入力の途中でご不明な点やお困りごとはございませんでしたでしょうか？\n日程のご都合や場所の調整など、どんな些細なことでも構いませんので、このLINEチャットにそのままお気軽にご返信ください😊\n専任のスタッフが個別にご案内・調整いたします✨\n\n▼ 入力内容からそのまま申し込む場合はこちら\n{{trial_url}}'
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

// 📍 エリア別おすすめ配信テンプレート
export const FILTER_AREA_PRESETS: Record<string, { title: string; body: string }> = {
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

const DEFAULT_AREAS = [
    '東京都',
    '港区・品川区',
    '渋谷・目黒',
    '世田谷・杉並',
    '神奈川県',
    '横浜市',
    '千葉県',
    '船橋市',
    '埼玉県',
];

export const SegmentFilterAccordion: React.FC<SegmentFilterAccordionProps> = ({
    selectedStatus,
    onChangeStatus,
    selectedArea,
    onChangeArea,
    selectedCoachId,
    onChangeCoachId,
    selectedPlanId,
    onChangePlanId,
    selectedTag,
    onChangeTag,
    viewedNotAppliedOnly,
    onToggleViewedNotAppliedOnly,
    lineLinkedOnly,
    onToggleLineLinkedOnly,
    searchQuery,
    onChangeSearchQuery,
    onResetFilters,
    onApplyPresetTag,
    onApplyPresetArea,
    hasCustomMessageInput,
    coaches,
    plans,
    activeFilterCount,
    statuses = [],
    areas = DEFAULT_AREAS,
    onOpenScheduledCampaigns,
    onRefresh,
    isLoading = false,
}) => {
    // 詳細フィルターのアコーディオン開閉状態（デフォルトは閉じてスッキリ表示）
    const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

    // 破壊的上書き防止ロジック付きのクイックタグ選択
    const handleQuickTagClick = (tag: string) => {
        const rawPreset = FILTER_TAG_PRESETS[tag];
        const template = rawPreset
            ? { title: rawPreset.title, body: rawPreset.body, message: rawPreset.body }
            : undefined;

        if (tag === 'trial_form_viewed') {
            onToggleViewedNotAppliedOnly(true);
        }

        // メッセージが入力済みの場合、確認ダイアログを表示
        if (template && hasCustomMessageInput) {
            const shouldOverwrite = window.confirm(
                'メッセージ本文が入力されています。クイック選択テンプレートで本文とタイトルを上書きしますか？\n\n' +
                '・「OK」: テンプレートを適用して絞り込みます\n' +
                '・「キャンセル」: 入力中の本文を保持し、絞り込み条件のみ変更します'
            );
            if (shouldOverwrite) {
                if (onApplyPresetTag) {
                    onApplyPresetTag(tag, template);
                } else {
                    onChangeTag(tag);
                }
            } else {
                onChangeTag(tag);
            }
            return;
        }

        // テンプレート未設定または未入力時は通常適用
        if (onApplyPresetTag && template) {
            onApplyPresetTag(tag, template);
        } else {
            onChangeTag(tag);
        }
    };

    // 破壊的上書き防止ロジック付きのクイックエリア選択
    const handleQuickAreaClick = (area: string) => {
        const rawPreset = FILTER_AREA_PRESETS[area];
        const template = rawPreset
            ? { title: rawPreset.title, body: rawPreset.body, message: rawPreset.body }
            : undefined;

        if (template && hasCustomMessageInput) {
            const shouldOverwrite = window.confirm(
                `メッセージ本文が入力されています。【${area}】テンプレートで本文とタイトルを上書きしますか？\n\n` +
                '・「OK」: テンプレートを適用して絞り込みます\n' +
                '・「キャンセル」: 入力中の本文を保持し、絞り込み条件のみ変更します'
            );
            if (shouldOverwrite) {
                if (onApplyPresetArea) {
                    onApplyPresetArea(area, template);
                } else {
                    onChangeArea(area);
                }
            } else {
                onChangeArea(area);
            }
            return;
        }

        if (onApplyPresetArea && template) {
            onApplyPresetArea(area, template);
        } else {
            onChangeArea(area);
        }
    };

    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            {/* 上部ヘッダー */}
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                セグメント抽出条件
                                {activeFilterCount > 0 && (
                                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2 py-0.5">
                                        {activeFilterCount}件 適用中
                                    </Badge>
                                )}
                            </CardTitle>
                        </div>
                    </div>

                    {/* 右側アクションボタン */}
                    <div className="flex items-center gap-2">
                        {onOpenScheduledCampaigns && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onOpenScheduledCampaigns}
                                className="min-h-[44px] sm:min-h-0 text-xs bg-blue-50/70 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                            >
                                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400" />
                                配信予約の確認
                            </Button>
                        )}
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="min-h-[44px] sm:min-h-0 text-xs text-slate-600 hover:text-slate-900"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                最新に更新
                            </Button>
                        )}
                    </div>
                </div>

                <CardDescription className="text-xs mt-1">
                    タグ、顧客ステータス、地域、担当コーチ、受講プランを掛け合わせて配信対象者を瞬時に特定できます。
                </CardDescription>

                {/* フリーワード検索バー & タグ別クイック選択（常時表示で直感操作） */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 space-y-2.5">
                    <div className="relative w-full">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="生徒氏名、カナ、会員番号（例: 0035）でリアルタイム検索..."
                            value={searchQuery}
                            onChange={e => onChangeSearchQuery(e.target.value)}
                            className="pl-9 h-10 text-xs sm:text-sm bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:bg-white"
                        />
                    </div>

                    {/* 🏷️ タグ別クイック選択バー（タッチターゲット44px・横スクロール保証） */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                            <Tag className="h-3 w-3 text-indigo-500" />
                            クイック選択:
                        </span>

                        <button
                            type="button"
                            onClick={() => handleQuickTagClick('all')}
                            className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                selectedTag === 'all'
                                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            全生徒
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickTagClick('trial_done')}
                            className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                selectedTag === 'trial_done'
                                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300'
                            }`}
                        >
                            🏊‍♂️ 体験受講後
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickTagClick('trial_form_viewed')}
                            className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                selectedTag === 'trial_form_viewed'
                                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                        >
                            ⚡ フォーム閲覧未申込
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickTagClick('trial_form_confirmed')}
                            className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                selectedTag === 'trial_form_confirmed'
                                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                        >
                            🔥 フォーム確認済未申込
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickTagClick('friend_only')}
                            className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                selectedTag === 'friend_only'
                                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                            }`}
                        >
                            💬 友だち追加のみ
                        </button>

                        <button
                            type="button"
                            onClick={() => handleQuickTagClick('referral_lead')}
                            className={`min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
                                selectedTag === 'referral_lead'
                                    ? 'bg-purple-600 text-white shadow-xs font-bold'
                                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300'
                            }`}
                        >
                            🎁 お友達紹介
                        </button>
                    </div>
                </div>
            </CardHeader>

            {/* アコーディオン開閉コントロール */}
            <CardContent className="pt-0">
                <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 pb-1">
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full flex items-center justify-between py-2 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 rounded-md transition-colors"
                            >
                                <span className="flex items-center gap-1.5">
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                                    詳細フィルター（エリア・ステータス・コーチ・プラン）
                                    {activeFilterCount > 0 && !isDetailsOpen && (
                                        <span className="text-[10px] text-emerald-600 font-bold ml-1">
                                            ({activeFilterCount}件 選択中)
                                        </span>
                                    )}
                                </span>
                                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-normal">
                                    {isDetailsOpen ? '閉じる' : '開く'}
                                    {isDetailsOpen ? (
                                        <ChevronUp className="w-4 h-4 ml-0.5" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 ml-0.5" />
                                    )}
                                </span>
                            </Button>
                        </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent className="space-y-4 pt-2">
                        {/* 📍 エリア別クイック一斉配信セレクターバー */}
                        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    エリア別クイック選択:
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleQuickAreaClick('all')}
                                    className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                        selectedArea === 'all'
                                            ? 'bg-slate-900 text-white shadow-xs font-bold'
                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                    }`}
                                >
                                    全エリア
                                </button>
                                {areas.map(area => (
                                    <button
                                        key={area}
                                        type="button"
                                        onClick={() => handleQuickAreaClick(area)}
                                        className={`min-h-[36px] sm:min-h-[30px] px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                            selectedArea === area
                                                ? 'bg-emerald-700 text-white shadow-xs font-bold'
                                                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200/80 dark:bg-slate-800 dark:text-emerald-300'
                                        }`}
                                    >
                                        {area}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 5列セレクトグリッド */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* 1. タグ指定 */}
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Tag className="h-3 w-3 text-indigo-500" />
                                    配信対象タグ
                                </Label>
                                <Select value={selectedTag} onValueChange={onChangeTag}>
                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900">
                                        <SelectValue placeholder="すべてのタグ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべてのタグ</SelectItem>
                                        <SelectItem value="trial_done">🏊‍♂️ 体験受講後</SelectItem>
                                        <SelectItem value="trial_form_viewed">⚡ 体験フォーム閲覧未申込</SelectItem>
                                        <SelectItem value="trial_form_confirmed">🔥 フォーム確認済未申込</SelectItem>
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
                                <Select value={selectedStatus} onValueChange={onChangeStatus}>
                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900">
                                        <SelectValue placeholder="すべてのステータス" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべてのステータス</SelectItem>
                                        {statuses.map(st => (
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
                                <Select value={selectedArea} onValueChange={onChangeArea}>
                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900">
                                        <SelectValue placeholder="すべてのエリア" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべてのエリア</SelectItem>
                                        {areas.map(area => (
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
                                <Select value={selectedCoachId} onValueChange={onChangeCoachId}>
                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900">
                                        <SelectValue placeholder="すべてのコーチ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべてのコーチ</SelectItem>
                                        {coaches.map(coach => (
                                            <SelectItem key={coach.id} value={coach.id}>
                                                {coach.name}
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
                                <Select value={selectedPlanId} onValueChange={onChangePlanId}>
                                    <SelectTrigger className="h-10 text-xs bg-white dark:bg-slate-900">
                                        <SelectValue placeholder="すべてのプラン" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">すべてのプラン</SelectItem>
                                        {plans.map(plan => (
                                            <SelectItem key={plan.id} value={plan.id}>
                                                {plan.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* 下段: トグルスイッチ群 & リセットボタン */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                                    <Switch
                                        checked={viewedNotAppliedOnly}
                                        onCheckedChange={onToggleViewedNotAppliedOnly}
                                        className="data-[state=checked]:bg-amber-600"
                                    />
                                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                        <Zap className="w-3.5 h-3.5" />
                                        フォーム閲覧・未申込者のみ（離脱フォロー）
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                                    <Switch
                                        checked={lineLinkedOnly}
                                        onCheckedChange={onToggleLineLinkedOnly}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                        LINE連携済のみ
                                    </span>
                                </label>
                            </div>

                            {activeFilterCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onResetFilters}
                                    className="min-h-[44px] sm:min-h-0 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                    条件をリセット
                                </Button>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </CardContent>
        </Card>
    );
};
