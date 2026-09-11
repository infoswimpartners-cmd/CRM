'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Send,
    Bot,
    Sparkles,
    TrendingUp,
    Target,
    DollarSign,
    Users,
    Copy,
    Check,
    Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { askJohnAction } from '@/actions/ai-marketer-actions';
import { ChatMessage } from '@/lib/ai-marketer-john';

interface JohnMarketingConsultDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuestion?: string;
}

const PRESET_QUESTIONS = [
    { label: '体験レッスンの成約率最大化', text: '体験レッスンから即日入会（成約率）を高めてLTVを最大化する具体的な改善プランを教えてください。' },
    { label: '広告費・CPAの削減', text: '現在の集客で無駄な広告費を削り、CPAを適正化するためのターゲット・除外KW設計を提案してください。' },
    { label: '月額サブスクと都度払いのプライシング', text: '都度払いと月額サブスクの価格バランス、および粗利率・LTVを高めるプライシング案を提示してください。' },
    { label: '本日のSEO 1位獲得ボトルネック', text: '現在2位の「進級の早い子」で1位を奪うために、ファネル全体で今週注力すべき最優先事項は何ですか？' },
];

export function JohnMarketingConsultDrawer({
    isOpen,
    onClose,
    initialQuestion,
}: JohnMarketingConsultDrawerProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-1',
            sender: 'john',
            timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            text: `こんにちは。スイムパートナーズ専属CMO兼戦略的Webマーケターの**ジョン**です。\n\n私は単なる作業代行ではなく、**「PL（損益）とLTVの最大化」**を最優先に考え、データとファクトに基づいた費用対効果の高い戦略・施策をご提案します。\n\n広告運用、LP成約率（LPO）、プライシング設計、体験後のリテンションなど、事業のボトルネックについて率直にご相談ください。`,
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            if (initialQuestion) {
                handleSend(initialQuestion);
            }
        }
    }, [isOpen, initialQuestion]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleCopy = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success('回答をクリップボードにコピーしました');
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            toast.error('コピーに失敗しました');
        }
    };

    const handleSend = async (textToSend?: string) => {
        const query = (textToSend || inputText).trim();
        if (!query || isLoading) return;

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputText('');
        setIsLoading(true);

        try {
            const res = await askJohnAction(query, messages);
            const johnMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                sender: 'john',
                text: res.answer,
                timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, johnMsg]);
        } catch (err) {
            toast.error('回答の取得中にエラーが発生しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 text-zinc-100 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
                {/* ヘッダー */}
                <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-white tracking-tight">
                                    AIチーフマーケター ジョン (John)
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                    CMO
                                </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                PL・LTV最大化 ✕ データドリブン戦略伴走パートナー
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                        title="閉じる"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* メッセージエリア */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-sm">
                    {/* プリセット質問タグ群 */}
                    <div className="space-y-2">
                        <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            ジョンへのクイック戦略相談:
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_QUESTIONS.map((pq, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(pq.text)}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 hover:border-amber-500/40 transition-all text-left disabled:opacity-50"
                                >
                                    {pq.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-zinc-800/80 pt-4 space-y-6">
                        {messages.map((msg) => {
                            const isJohn = msg.sender === 'john';

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${isJohn ? 'items-start' : 'items-start flex-row-reverse'}`}
                                >
                                    {isJohn ? (
                                        <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-300 mt-1">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0 text-indigo-300 mt-1 font-bold text-xs">
                                            YOU
                                        </div>
                                    )}

                                    <div className={`max-w-[85%] space-y-2 ${isJohn ? 'text-zinc-200' : 'text-white'}`}>
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                                            <span>{isJohn ? 'ジョン (CMO)' : 'あなた'}</span>
                                            <span>•</span>
                                            <span>{msg.timestamp}</span>
                                        </div>

                                        <div
                                            className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                                                isJohn
                                                    ? 'bg-zinc-900 border border-zinc-800 shadow-md select-text'
                                                    : 'bg-indigo-600 text-white rounded-tr-none'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>

                                        {isJohn && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={() => handleCopy(msg.text, msg.id)}
                                                    className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-[11px] font-mono flex items-center gap-1 border border-zinc-800 transition-colors"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-400" /> コピー済
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" /> コピー
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-300 mt-1">
                                    <Bot className="w-4 h-4 animate-spin" />
                                </div>
                                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-xs text-zinc-400 flex items-center gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                                    ジョンが損益構造・ファネル・実データを分析して戦略を立案中...
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* 入力フォーム */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/90">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="ジョンに相談する（例: 体験からの成約率を改善したい、広告文の修正案...）"
                            disabled={isLoading}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isLoading}
                            className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 flex-shrink-0"
                        >
                            <Send className="w-3.5 h-3.5" />
                            送信
                        </button>
                    </form>
                    <div className="text-[10px] text-zinc-500 mt-2 text-center">
                        ※ ジョンは「PL・LTVファースト」「ボトルネック分解」「現場実行レベル」「プロとしての直言」の思考原則で回答します。
                    </div>
                </div>
            </div>
        </div>
    );
}
