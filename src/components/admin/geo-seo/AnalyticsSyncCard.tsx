'use client'

import React, { useState } from 'react'
import { RefreshCw, ArrowUpRight, CheckCircle2, AlertCircle, Settings2, ExternalLink, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { GA4TrafficSummary } from '@/lib/google-analytics'
import { SearchConsoleSummary } from '@/lib/google-search-console'

interface AnalyticsSyncCardProps {
    isConfigured?: boolean
    ga4Connected?: boolean
    searchConsoleConnected?: boolean
    lastSynced?: string
    ga4Data?: GA4TrafficSummary | null
    searchConsoleData?: SearchConsoleSummary | null
    onSync?: () => Promise<void>
}

export function AnalyticsSyncCard({
    isConfigured = false,
    ga4Connected = false,
    searchConsoleConnected = false,
    lastSynced = '未同期',
    ga4Data,
    searchConsoleData,
    onSync,
}: AnalyticsSyncCardProps) {
    const [isSyncing, setIsSyncing] = useState(false)
    const [showGuideModal, setShowGuideModal] = useState(false)

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            if (onSync) {
                await onSync()
            }
            toast.success(isConfigured ? 'GA4 & Search Console の最新データを取得しました' : 'データ同期を実行しました')
        } catch (err) {
            toast.error('データの同期に失敗しました')
        } finally {
            setIsSyncing(false)
        }
    }

    // 実データがある場合は実データを使用、なければデモ/初期データ
    const trafficSources = ga4Data?.channelBreakdown ? [
        {
            name: 'AI引用 (Perplexity/ChatGPT等)',
            share: ga4Data.channelBreakdown.aiSearch.share,
            count: `${ga4Data.channelBreakdown.aiSearch.count.toLocaleString()} 回`,
            isAi: true,
        },
        {
            name: 'Google自然検索 (SEO)',
            share: ga4Data.channelBreakdown.organicSearch.share,
            count: `${ga4Data.channelBreakdown.organicSearch.count.toLocaleString()} 回`,
            isAi: false,
        },
        {
            name: 'Googleマップ (MEO)',
            share: ga4Data.channelBreakdown.maps.share,
            count: `${ga4Data.channelBreakdown.maps.count.toLocaleString()} 回`,
            isAi: false,
        },
        {
            name: 'SNS・その他 (Instagram/LINE)',
            share: ga4Data.channelBreakdown.sns.share,
            count: `${ga4Data.channelBreakdown.sns.count.toLocaleString()} 回`,
            isAi: false,
        },
    ] : [
        { name: 'AI引用 (Perplexity/ChatGPT)', share: '32%', count: '1,420 回', isAi: true },
        { name: 'Google自然検索 (SEO)', share: '45%', count: '1,980 回', isAi: false },
        { name: 'Googleマップ (MEO)', share: '15%', count: '660 回', isAi: false },
        { name: 'SNS・その他 (Instagram/LINE)', share: '8%', count: '350 回', isAi: false },
    ]

    return (
        <>
            <div className="bg-white rounded-2xl border border-zinc-200/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-zinc-100 gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-extrabold text-zinc-900 text-xl tracking-tight">
                                GA4 & Search Console データ連携
                            </h3>
                            {isConfigured ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> API CONNECTED (実データ連動中)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <AlertCircle className="w-3 h-3 text-amber-600" /> デモデータ表示中（未接続）
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 font-mono">
                            最終同期: {lastSynced} {isConfigured && `(GA4: ${ga4Connected ? '接続済' : '未設定'} / Search Console: ${searchConsoleConnected ? '接続済' : '未設定'})`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowGuideModal(true)}
                            className="px-3.5 py-2 rounded-xl border border-zinc-200 text-xs font-semibold bg-white text-zinc-700 hover:bg-zinc-50 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                            <Settings2 className="w-3.5 h-3.5 text-zinc-500" />
                            API接続設定
                        </button>

                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="px-4 py-2 rounded-xl border border-zinc-900 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? '同期中...' : '再同期する'}
                        </button>
                    </div>
                </div>

                {/* 流入元・AI検索比率グリッド */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {trafficSources.map((source, idx) => (
                        <div
                            key={idx}
                            className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                                source.isAi
                                    ? 'bg-gradient-to-br from-indigo-50/40 via-white to-white border-indigo-200/80'
                                    : 'bg-zinc-50/60 border-zinc-200/60 hover:border-zinc-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-zinc-600">{source.name}</span>
                                {source.isAi && (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-700">
                                        GEO指標
                                    </span>
                                )}
                            </div>

                            <div className="mt-4">
                                <div className="text-2xl font-extrabold tracking-tight text-zinc-900 flex items-center justify-between">
                                    {source.count}
                                    <ArrowUpRight className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div className="text-[11px] font-mono text-zinc-400 mt-1">
                                    構成比: <strong className="text-zinc-800">{source.share}</strong>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Search Console 実数値パネル (接続されている場合) */}
                {searchConsoleData && (
                    <div className="pt-4 border-t border-zinc-100 space-y-4">
                        <div className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                            GOOGLE SEARCH CONSOLE PERFORMANCE (過去28日間)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                                <div className="text-xs text-zinc-500 font-medium">合計クリック数</div>
                                <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.clicks.toLocaleString()} 回</div>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                                <div className="text-xs text-zinc-500 font-medium">合計表示回数</div>
                                <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.impressions.toLocaleString()} 回</div>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                                <div className="text-xs text-zinc-500 font-medium">平均CTR</div>
                                <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.ctr}</div>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/60">
                                <div className="text-xs text-zinc-500 font-medium">平均掲載順位</div>
                                <div className="text-2xl font-black text-zinc-900 mt-1">{searchConsoleData.averagePosition} 位</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* API接続設定・手順案内モーダル */}
            {showGuideModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-zinc-200 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold text-zinc-900">Google Cloud API 接続設定ガイド</h3>
                            </div>
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="text-zinc-400 hover:text-zinc-600 font-mono text-sm px-2 py-1"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 text-xs text-zinc-600 leading-relaxed">
                            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 text-indigo-900">
                                <strong className="block mb-1 font-bold">完全無料（0円）でご利用いただけます</strong>
                                Google Analytics Data APIおよびSearch Console APIはGoogleにより無料提供されており、費用は一切かかりません。
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-zinc-900 text-sm">接続手順（3ステップ）:</h4>

                                <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1">
                                    <strong className="text-zinc-900 font-bold block">1. Google Cloud ConsoleでAPIを有効化</strong>
                                    <p>「Google Analytics Data API」および「Google Search Console API」を検索して有効にします。</p>
                                </div>

                                <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1">
                                    <strong className="text-zinc-900 font-bold block">2. サービスアカウントの作成 &amp; 鍵の発行</strong>
                                    <p>「IAMと管理 → サービスアカウント」から作成し、キー（JSON）をダウンロードします。このJSONの中身を環境変数に設定します。</p>
                                </div>

                                <div className="p-3.5 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1">
                                    <strong className="text-zinc-900 font-bold block">3. GA4 / Search Consoleへ閲覧者追加</strong>
                                    <p>GA4の「プロパティのアクセス管理」とSearch Consoleの「設定 → ユーザーと権限」で、サービスアカウントのメールアドレスを「閲覧者」として追加します。</p>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <h4 className="font-bold text-zinc-900 text-sm">設定する環境変数（.env.local）:</h4>
                                <pre className="p-4 rounded-xl bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed">
{`# 1. GA4プロパティID (9桁の数字)
GA4_PROPERTY_ID="123456789"

# 2. Search ConsoleのサイトURL
SEARCH_CONSOLE_SITE_URL="https://swim-partners.com/"

# 3. サービスアカウントのJSON鍵の中身 (1行のJSON文字列)
GOOGLE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "client_email": "...", "private_key": "..."}'`}
                                </pre>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-zinc-100">
                            <button
                                onClick={() => setShowGuideModal(false)}
                                className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-all"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
