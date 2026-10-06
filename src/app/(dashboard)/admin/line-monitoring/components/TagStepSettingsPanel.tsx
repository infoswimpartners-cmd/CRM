'use client';

/**
 * LINE管理画面用 タグ別ステップ配信・マーケティング連携パネル
 * 
 * 責務:
 *   1. 各タグ別（体験後、フォーム閲覧未申込、友だち追加、紹介）のステップ配信設定状況の一覧表示
 *   2. ワンクリックでステップ編集エディタ（/admin/line-marketing）へのシームレス誘導
 *   3. タグ別の離脱防止・入会促進シナリオの可視化
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tag,
    Layers,
    Send,
    ExternalLink,
    CheckCircle2,
    Clock,
    ShieldCheck,
    Users,
    Sparkles,
    ArrowRight,
    RefreshCw,
    Activity,
    Plus
} from 'lucide-react';
import { getTagsSummaryAction, getStepRules } from '@/actions/line-marketing';
import { TagSummaryItem } from '@/types/line-tracking';
import { StepRuleItem } from '@/types/line-marketing';
import { toast } from 'sonner';

export function TagStepSettingsPanel() {
    const [tags, setTags] = useState<TagSummaryItem[]>([]);
    const [rules, setRules] = useState<StepRuleItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [tagsRes, rulesRes] = await Promise.all([
                getTagsSummaryAction(),
                getStepRules('all')
            ]);
            if (tagsRes.success && tagsRes.tags) {
                setTags(tagsRes.tags);
            }
            if (rulesRes.success && rulesRes.rules) {
                setRules(rulesRes.rules);
            }
        } catch (e) {
            console.error('[TagStepSettingsPanel] Load error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // タグごとの定義マスタ
    const TAG_SCENARIOS = [
        {
            tag: 'trial_done',
            title: '体験レッスン受講済フォロー',
            badge: '🏊‍♂️ 体験受講後',
            badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
            description: '体験レッスン受講完了日を起点として、お礼・フィードバック・入会特典を順次自動配信します。',
            targetLead: '体験レッスン受講済（trial_done）の生徒',
            safetyNotice: '本会員へ入会（active）または退会した生徒には自動スキップされます。',
            recommendedTiming: '1日後 19:00 / 3日後 12:00 / 7日後 19:00',
        },
        {
            tag: 'trial_form_viewed',
            title: 'フォーム閲覧・未申込 離脱フォロー',
            badge: '⚡ フォーム閲覧離脱',
            badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
            description: '公式LINEから体験予約フォーム（LIFF）を開いたものの、申込に至らなかった見込み客へフォローメッセージを自動配信します。',
            targetLead: '体験フォームを開いたが未申込のLINEユーザー',
            safetyNotice: '正式に申込が完了（trial_applied）した時点で自動的に除外・停止されます。',
            recommendedTiming: '1日後 18:00 / 3日後 19:00',
        },
        {
            tag: 'friend_only',
            title: '公式LINE友だち追加リード初期案内',
            badge: '💬 友だち追加',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
            description: 'LINE公式アカウントを友だち追加した直後のリードへ、スクール出張プール案内やお悩み解決を自動配信します。',
            targetLead: '友だち追加のみ（未申込）の新規リード',
            safetyNotice: '体験申込または問い合わせチャット返信で自動的に停止します。',
            recommendedTiming: '24時間後 / 72時間後 / 120時間後',
        },
        {
            tag: 'referral_lead',
            title: 'お友達紹介キャンペーン案内',
            badge: '🎁 お友達紹介',
            badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
            description: 'ご紹介者様のお名前を入力したリードや紹介導線からのアクセス者へ、特別価格（3,500円）のご案内を配信します。',
            targetLead: '紹介キャンペーン対象のリード',
            safetyNotice: '通常価格との差額特典を明記した安心メッセージをお届けします。',
            recommendedTiming: '1日後 12:00',
        },
    ];

    return (
        <div className="space-y-6">
            {/* 上部ヘッダー案内バナー */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-indigo-300" />
                        <h2 className="text-lg font-bold">タグ別ステップ配信シナリオ設定</h2>
                        <Badge className="bg-indigo-500/40 text-indigo-100 border-indigo-400/30 text-[10px]">
                            Lステップ連携
                        </Badge>
                    </div>
                    <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl">
                        顧客の行動や状態（フォーム閲覧、体験受講、友だち追加、紹介経由）に応じて自動付与されたタグごとに、最適なステップメッセージを自動配信します。
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={isLoading}
                        className="bg-indigo-950/60 border-indigo-700 text-indigo-200 hover:bg-indigo-900 h-9 text-xs gap-1"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        更新
                    </Button>
                    <Link href="/admin/line-marketing">
                        <Button
                            size="sm"
                            className="bg-white text-indigo-900 hover:bg-indigo-50 h-9 text-xs font-bold gap-1.5 shadow-sm"
                        >
                            <Sparkles className="h-4 w-4 text-indigo-600" />
                            LINEマーケティング画面を開く
                        </Button>
                    </Link>
                </div>
            </div>

            {/* 4大タグシナリオカードグリッド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {TAG_SCENARIOS.map(sc => {
                    // 該当タグの現在設定ルール
                    const tagRules = rules.filter(r => (r.targetTag || 'trial_done') === sc.tag);
                    const tagInfo = tags.find(t => t.tagName === sc.tag);
                    const activeCount = tagRules.filter(r => r.isActive).length;

                    return (
                        <Card key={sc.tag} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${sc.badgeColor}`}>
                                                {sc.badge}
                                            </span>
                                            <span className="text-[11px] font-mono text-slate-400">
                                                タグ: {sc.tag}
                                            </span>
                                        </div>
                                        <CardTitle className="text-base font-bold text-slate-800">
                                            {sc.title}
                                        </CardTitle>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-semibold text-slate-600">
                                            保有対象: <span className="font-bold text-indigo-600">{tagInfo?.userCount ?? 0}</span> 名
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            配信設定: {activeCount}/{tagRules.length} 件有効
                                        </div>
                                    </div>
                                </div>
                                <CardDescription className="text-xs text-slate-600 mt-2 leading-relaxed">
                                    {sc.description}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="pt-4 space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-3">
                                    {/* 配信スケジュール概要 */}
                                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-100">
                                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                            <Clock className="h-3.5 w-3.5 text-slate-500" />
                                            <span>推奨配信タイミング:</span>
                                        </div>
                                        <div className="font-mono text-slate-600 pl-5">
                                            {sc.recommendedTiming}
                                        </div>
                                    </div>

                                    {/* 安全制御インジケータ */}
                                    <div className="flex items-start gap-2 p-2.5 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] border border-emerald-100">
                                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>{sc.safetyNotice}</span>
                                    </div>
                                </div>

                                {/* カード下部アクションボタン群 */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <Link href={`/admin/line-marketing`} className="w-full">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-xs font-semibold text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-8 gap-1"
                                        >
                                            <Layers className="h-3.5 w-3.5" />
                                            このタグのステップを編集・追加
                                            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* 画面下のクイックガイド */}
            <Card className="border-indigo-100 bg-indigo-50/50">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-indigo-950 font-medium">
                        <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>「LINEマーケティング」メニューでは、カード形式の直感的なドラッグ＆ドロップ並び替えや、テスト太郎様への安全プレビュー送信が可能です。</span>
                    </div>
                    <Link href="/admin/line-marketing" className="shrink-0">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 gap-1">
                            ステップ配信エディタを開く
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
