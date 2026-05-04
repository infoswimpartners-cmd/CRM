'use client';

import React from 'react';
import { Sparkles, ArrowRight, MapPin, Play, Ticket, ChevronRight, Crown, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TrioUnifiedHeroProps {
    isLoggedIn: boolean;
    isMember: boolean;
    ticketBalance?: number;
    nextSession?: any;
    onEnrollClick: () => void;
    onLineLogin?: () => void;
    onAccessClick?: () => void;
    onCancelClick?: (id: string) => void;
}

/**
 * TrioUnifiedHero
 * 全てのユーザーパターン（ゲスト・予約済み・本会員）を統合した単一のヒーローセクション。
 * 明るくクールな「パターンA」をベースに、ステータスに応じて要素を動的に配置。
 */
export const TrioUnifiedHero = ({
    isLoggedIn,
    isMember,
    ticketBalance = 0,
    nextSession,
    onEnrollClick,
    onLineLogin,
    onAccessClick,
    onCancelClick
}: TrioUnifiedHeroProps) => {
    return (
        <div className="space-y-16 animate-fade-in-up">
            {/* 1. メインメッセージ & タイポグラフィ */}
            <div className="space-y-8 text-center pt-4">
                <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full bg-white border border-sky-100 shadow-[0_4px_20px_rgba(56,189,248,0.08)] transition-all">
                    {isMember ? <Crown className="w-4 h-4 text-amber-500" /> : <Sparkles className="w-4 h-4 text-sky-500" />}
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                        {isMember ? 'Trio Premium Member' : 'Premium Logic Swim'}
                    </span>
                </div>
                
                <div className="space-y-4 px-4">
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 leading-[1.05]">
                        {isLoggedIn ? (
                            <>Logic Evolution,<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-600 to-sky-400 animate-gradient-x">With You.</span></>
                        ) : (
                            <>Welcome to<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-600 to-sky-400 animate-gradient-x">THE TRIO.</span></>
                        )}
                    </h1>
                    <p className="max-w-xl mx-auto text-slate-500 text-sm md:text-base font-medium leading-relaxed px-4 pt-4">
                        {isMember 
                            ? "あなたの論理的進化を、最適なマッチングと共に。現在のステータスと募集中のセッションを確認できます。"
                            : isLoggedIn
                                ? "募集中のセッションから、あなたの進化を加速させる場所を選びましょう。"
                                : "公式LINEでログインすることで、マッチング成立時の通知や、特別な学習コンテンツを受け取ることができます。"}
                    </p>
                </div>
            </div>

            {/* 2. ステータスカード & 次回予約 (条件付き) */}
            <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                {/* 会員ステータス (本会員のみ) */}
                {isMember && (
                    <div className="bg-white border border-sky-100 rounded-[2.5rem] p-10 flex flex-col justify-between group overflow-hidden relative shadow-[0_20px_60px_rgba(56,189,248,0.05)]">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-sky-50 rounded-full blur-[60px] -mr-20 -mt-20 opacity-60" />
                        <div className="space-y-3 relative z-10">
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Ticket Balance</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black text-slate-900 tracking-tighter">{ticketBalance}</span>
                                <span className="text-xs font-black text-sky-500 uppercase">Sessions</span>
                            </div>
                        </div>
                        <div className="mt-8 flex items-center gap-3 text-slate-400">
                            <Ticket className="w-5 h-5 text-sky-400" />
                            <span className="text-xs font-bold">保有チケットで予約可能です</span>
                        </div>
                    </div>
                )}

                {/* 次回セッション または 未エントリー通知 */}
                {nextSession ? (
                    /* 予約がある場合：セッションカードを表示 */
                    <div className={cn(
                        "rounded-[2.5rem] p-10 flex flex-col justify-center relative overflow-hidden group shadow-2xl transition-all",
                        isMember ? "bg-slate-900 shadow-slate-200" : "bg-white border border-sky-100 shadow-sky-100"
                    )}>
                        <div className={cn(
                            "absolute top-0 right-0 w-40 h-40 rounded-full blur-[50px] -mr-20 -mt-20 opacity-20",
                            isMember ? "bg-sky-400" : "bg-sky-100"
                        )} />
                        <div className="space-y-5 relative z-10">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className={cn("w-4 h-4", isMember ? "text-sky-400" : "text-sky-500")} />
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.3em]", isMember ? "text-sky-400" : "text-slate-500")}>
                                    Next Entry Active
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h3 className={cn("text-3xl md:text-4xl font-black tracking-tighter leading-tight", isMember ? "text-white" : "text-slate-900")}>
                                    {nextSession.date}<br/>
                                    <span className="text-sky-400">{nextSession.time}</span>
                                </h3>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {nextSession.location}
                                    </div>
                                    
                                    {/* マッチング状況 */}
                                    <div className={cn(
                                        "p-4 rounded-2xl space-y-3",
                                        isMember ? "bg-white/5" : "bg-sky-50/50"
                                    )}>
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-0.5">
                                                <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isMember ? "text-slate-500" : "text-slate-400")}>
                                                    Matching Status
                                                </span>
                                                <p className={cn("text-xs font-black", isMember ? "text-white" : "text-slate-900")}>
                                                    {(nextSession.reservedCount || 0) >= 2 ? (
                                                        <span className="flex items-center gap-1.5 text-emerald-400">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            マッチング成立！
                                                        </span>
                                                    ) : (
                                                        `あと ${2 - (nextSession.reservedCount || 0)} 名でマッチング成立`
                                                    )}
                                                </p>
                                            </div>
                                            <span className={cn("text-[10px] font-black", isMember ? "text-slate-400" : "text-slate-500")}>
                                                {nextSession.reservedCount || 0} / 3 名
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <div className={cn("h-2 w-full rounded-full overflow-hidden p-0.5", isMember ? "bg-white/10" : "bg-white")}>
                                                <div 
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000 ease-out",
                                                        (nextSession.reservedCount || 0) >= 2 
                                                            ? "bg-gradient-to-r from-emerald-400 to-teal-500" 
                                                            : "bg-gradient-to-r from-sky-400 to-blue-500"
                                                    )}
                                                    style={{ width: `${Math.max(((nextSession.reservedCount || 0) / 3) * 100, 10)}%` }}
                                                />
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-500 text-right">※ 2名以上で開催確定（最大3名）</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {onAccessClick && (
                                <Button 
                                    onClick={onAccessClick}
                                    variant="ghost"
                                    className={cn(
                                        "w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest mt-2",
                                        isMember ? "bg-white/5 text-white hover:bg-white/10 border-white/10" : "bg-sky-50 text-sky-600 border-sky-100"
                                    )}
                                >
                                    アクセスを確認
                                </Button>
                            )}
                        </div>
                    </div>
                ) : (
                    /* 予約がない場合：ログイン済みの全ユーザーに対して表示 */
                    isLoggedIn && (
                        <div className="bg-sky-50/50 border border-sky-100 border-dashed rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                                <Play className="w-6 h-6 text-sky-500 ml-1" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-slate-800">未エントリー</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {isMember ? "現在予約されているセッションはありません。" : "まずは、募集中のセッションから"}<br/>
                                    {isMember ? "次回のレッスンを選びましょう。" : "体験予約をしてみましょう。"}
                                </p>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* 3. アクションボタン */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 px-6 max-w-2xl mx-auto">
                {!isLoggedIn && (
                    <Button 
                        size="lg" 
                        className="w-full sm:w-auto h-20 px-10 rounded-[2rem] bg-[#06C755] hover:bg-[#05b34d] text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-[0_20px_50px_rgba(6,199,85,0.2)] group border-none"
                        onClick={onLineLogin}
                    >
                        公式LINEでログイン・登録
                        <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                )}
                <Button 
                    variant={isLoggedIn ? "default" : "outline"}
                    size="lg" 
                    className={cn(
                        "w-full sm:w-auto h-20 px-10 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all active:scale-95",
                        isLoggedIn 
                            ? "bg-sky-600 hover:bg-sky-500 text-white shadow-[0_20px_50px_rgba(56,189,248,0.3)] border-none" 
                            : "border-sky-100 bg-white text-slate-600 hover:bg-sky-50 shadow-sm"
                    )}
                    onClick={onEnrollClick}
                >
                    募集中のセッションを見る
                    <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
            </div>

            {/* 4. 特徴 & ガイド (共通セクション) */}
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                    <div className="p-10 space-y-8 flex flex-col justify-center bg-white/70 backdrop-blur-xl border border-sky-50 rounded-[3rem] shadow-[0_20px_60px_rgba(56,189,248,0.05)]">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight">THE TRIOの核となる論理</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Philosophy of Logic Swim</p>
                        </div>
                        <div className="space-y-6">
                            {[
                                { title: '解剖学的分析', desc: '個々の骨格と筋肉の動きに基づき、最適なフォームを構築します。' },
                                { title: '物理効率の最大化', desc: '水の抵抗を最小限に抑え、最小の力で最大の推進量を生む設計。' },
                                { title: '再現性の追求', desc: '「感覚」ではなく「言語」で理解することで、一生疲れない泳ぎを。' },
                            ].map((item, i) => (
                                <div key={i} className="flex gap-4 items-start group">
                                    <div className="w-2 h-2 rounded-full bg-sky-400 mt-2 shrink-0 group-hover:scale-150 transition-transform shadow-[0_0_10px_rgba(56,189,248,0.3)]" />
                                    <div className="space-y-1">
                                        <h4 className="text-[15px] font-black text-slate-700 tracking-tight">{item.title}</h4>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-10 space-y-8 flex flex-col justify-center bg-white/70 backdrop-blur-xl border border-sky-50 rounded-[3rem] shadow-[0_20px_60px_rgba(56,189,248,0.05)]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center border border-sky-100">
                                <Sparkles className="w-6 h-6 text-sky-500" />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="text-xl font-black text-slate-800">Guide</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Lesson Info</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="p-8 rounded-[2rem] bg-sky-50/50 border border-sky-100">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Necessary Items</p>
                                <p className="text-lg text-slate-700 font-black tracking-tight">水着・ゴーグル・キャップ</p>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed font-bold px-2">
                                ※レンタル完備。手ぶらでの参加も歓迎します。
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
