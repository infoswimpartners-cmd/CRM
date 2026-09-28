'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    X,
    Send,
    Bot,
    Sparkles,
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
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-800/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-white border-l border-zinc-200 text-slate-900 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300">
                {/* ヘッダー */}
                <div className="p-4 sm:p-6 border-b border-zinc-200 bg-slate-50/90 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-sm">
                            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-black text-slate-900 tracking-tight">
                                    AIチーフマーケター ジョン (John)
                                </h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                    専属CMO
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                PL・LTV最大化 ✕ データドリブン戦略伴走パートナー
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                        title="閉じる"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* メッセージエリア */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm bg-[#fafafa]">
                    {/* プリセット質問タグ群 */}
                    <div className="space-y-2">
                        <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-1.5 font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            ジョンへのクイック戦略相談:
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_QUESTIONS.map((pq, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSend(pq.text)}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium border border-zinc-200 hover:border-amber-300 transition-all text-left shadow-xs disabled:opacity-50"
                                >
                                    {pq.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-zinc-200/80 pt-4 space-y-5">
                        {messages.map((msg) => {
                            const isJohn = msg.sender === 'john';

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex gap-3 ${isJohn ? 'items-start' : 'items-start flex-row-reverse'}`}
                                >
                                    {isJohn ? (
                                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-700 mt-1 shadow-xs">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 rounded-xl bg-indigo-600 border border-indigo-100 flex items-center justify-center flex-shrink-0 text-white mt-1 font-bold text-xs shadow-xs">
                                            YOU
                                        </div>
                                    )}

                                    <div className={`max-w-[85%] space-y-1.5 ${isJohn ? 'text-zinc-800' : 'text-slate-900'}`}>
                                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                                            <span className="font-bold">{isJohn ? 'ジョン (CMO)' : 'あなた'}</span>
                                            <span>•</span>
                                            <span>{msg.timestamp}</span>
                                        </div>

                                        <div
                                            className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                                                isJohn
                                                    ? 'bg-white border border-zinc-200 shadow-xs select-text'
                                                    : 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                                            }`}
                                        >
                                            {msg.text}
                                        </div>

                                        {isJohn && (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    onClick={() => handleCopy(msg.text, msg.id)}
                                                    className="px-2.5 py-1 rounded-md bg-white hover:bg-zinc-100 text-zinc-600 hover:text-slate-900 text-[11px] font-mono flex items-center gap-1 border border-zinc-200 transition-colors shadow-xs"
                                                >
                                                    {copiedId === msg.id ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-600" /> コピー済
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
                                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 text-amber-700 mt-1 shadow-xs">
                                    <Bot className="w-4 h-4 animate-spin" />
                                </div>
                                <div className="bg-white border border-zinc-200 p-4 rounded-2xl text-xs text-zinc-600 flex items-center gap-2 shadow-xs">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                    ジョンが損益構造・ファネル・実データを分析して戦略を立案中...
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* 入力フォーム */}
                <div className="p-3.5 sm:p-4 border-t border-zinc-200 bg-white">
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
                            className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition-colors disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim() || isLoading}
                            className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 flex-shrink-0"
                        >
                            <Send className="w-3.5 h-3.5" />
                            送信
                        </button>
                    </form>
                    <div className="text-[10px] text-zinc-400 mt-2 text-center">
                        ※ ジョンは「PL・LTVファースト」「ボトルネック分解」「現場実行レベル」「プロとしての直言」の思考原則で回答します。
                    </div>
                </div>
            </div>
        </div>
    );
}
