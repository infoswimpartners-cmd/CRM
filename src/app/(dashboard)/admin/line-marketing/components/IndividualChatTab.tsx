'use client';

/**
 * Lステップ風 1対1 個別トーク・チャット管理タブコンポーネント
 * 
 * 構成（3ペイン / モバイル時は画面切り替え対応）:
 *   - 左ペイン: LINE連携済みの生徒および未申込の公式LINE友だち（リード）一覧（検索、未読/要対応フィルター、ステータス・タグバッジ）
 *   - 中央ペイン: 時系列チャットタイムライン（受信メッセージ、自動配信・一括配信・個別返信履歴のLINE風吹き出しUI）＋ 個別送信エディタ（定型文・変数置換対応）
 *   - 右ペイン: 顧客カルテ詳細（表示名、生徒氏名、会員番号、ステータス変更、エリア、担当コーチ、タグ追加・削除、対応メモ編集）
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    LineChatMessage,
    LineChatThreadUser,
} from '@/types/line-marketing';
import {
    getLineChatThreadsAction,
    getLineChatHistoryAction,
    sendDirectLineChatMessageAction,
    toggleLineChatNeedsReplyAction,
    updateLineChatUserProfileAction,
    assignTagToUserAction,
    removeTagFromUserAction,
} from '@/actions/line-marketing';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Link from 'next/link';
import {
    Search,
    Send,
    RefreshCw,
    User,
    Tag,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    Clock,
    MessageSquare,
    Sparkles,
    FileText,
    ExternalLink,
    Copy,
    Check,
    ChevronLeft,
    PanelRightClose,
    PanelRightOpen,
    Loader2,
    ShieldCheck,
    Megaphone,
    Layers,
    ShoppingBag,
    FlaskConical,
    Save,
    Ban,
    Play,
} from 'lucide-react';

const TEST_TARO_LINE_USER_ID = 'U0e5a7654874369ca5e38deb47fd783aa';
const TEST_TARO_STUDENT_NUMBER = '0035';

const STANDARD_TAG_OPTIONS = [
    { value: 'trial_done', label: '体験受講後' },
    { value: 'trial_form_viewed', label: '体験フォーム閲覧' },
    { value: 'trial_applied', label: '体験申込完了' },
    { value: 'friend_only', label: '友だち追加のみ' },
    { value: 'referral_lead', label: 'お友達紹介経由' },
    { value: 'audience:kids', label: '対象: キッズ/ジュニア' },
    { value: 'audience:adult', label: '対象: 大人/マスターズ' },
];

const TAG_DISPLAY_MAP: Record<string, string> = {
    trial_done: '体験受講後',
    trial_form_viewed: 'フォーム閲覧',
    trial_applied: '体験申込完了',
    friend_only: '友だち追加のみ',
    referral_lead: '紹介経由',
    cart_recovery_sent: 'カゴ落ち送信済',
    'audience:kids': 'キッズ',
    'audience:adult': '大人',
};

const STATUS_OPTIONS = [
    { value: 'friend_only', label: 'LINE友だち(未申込)' },
    { value: 'inquired', label: '問い合わせ・相談中' },
    { value: 'applied', label: '体験申込済' },
    { value: 'trial_pending', label: '体験日程調整中' },
    { value: 'trial_confirmed', label: '体験確定' },
    { value: 'trial_done', label: '体験受講済' },
    { value: 'active', label: '本会員(受講中)' },
    { value: 'resting', label: '休会中' },
    { value: 'withdrawn', label: '退会済' },
];

const QUICK_REPLY_TEMPLATES = [
    {
        id: 'schedule_reply',
        label: '📅 日程調整・空き枠確認の返信',
        text: '{{name}} 様、メッセージありがとうございます！Swim Partners事務局です😊\n\nご希望の日時・プールエリアについて承知いたしました。\n担当コーチの空き枠を確認の上、改めてご提案いたしますので今しばらくお待ちくださいませ🏊‍♂️',
    },
    {
        id: 'trial_guide',
        label: '🏊‍♂️ 体験レッスンのご案内',
        text: '{{name}} 様、お問い合わせありがとうございます！Swim Partners事務局です✨\n\nご自宅近くの公営プールへ専属コーチが出張してマンツーマン指導を行っております。\n▼ 体験レッスンの詳細・ご希望日時のお申し込みはこちら\n{{trial_url}}\n\nフォームの入力が難しい場合は、このままチャットでご希望の曜日や最寄り駅をお教えいただく形でも予約可能です😊',
    },
    {
        id: 'after_trial_followup',
        label: '✨ 体験受講後のお礼・ご入会相談',
        text: '{{name}} 様、先日はSwim Partnersの体験レッスンをご受講いただき誠にありがとうございました！🏊‍♂️\n\nレッスンのご感想やお子様のご様子はいかがでしたでしょうか？\n継続プランや今後のスケジュールについてご不明な点がございましたら、いつでもこのチャットにてお気軽にご相談くださいね😊',
    },
    {
        id: 'pool_consultation',
        label: '📍 出張可能プールのご相談',
        text: '{{name}} 様、ご連絡ありがとうございます！事務局です😊\n\n当スクールでは区民プールや市民プールなど、個人利用が可能な温水プールへコーチが出張いたします。\nお住まいの地域やご希望の最寄り駅をお教えいただけましたら、近くで利用しやすいプールを事務局でお調べしてご案内いたします！',
    },
];

const INSERTABLE_VARIABLES = [
    { key: '{{name}}', label: 'お名前' },
    { key: '{{coach_name}}', label: '担当コーチ' },
    { key: '{{area}}', label: 'エリア' },
    { key: '{{plan_name}}', label: 'プラン名' },
    { key: '{{trial_url}}', label: '体験申込URL' },
];

interface IndividualChatTabProps {
    initialLineUserId?: string | null;
    onUnreadCountChange?: (unreadCount: number, needsReplyCount: number) => void;
    onDeliverySuccess?: () => void;
}

export function IndividualChatTab({
    initialLineUserId,
    onUnreadCountChange,
    onDeliverySuccess,
}: IndividualChatTabProps) {
    // スレッド一覧状態
    const [threads, setThreads] = useState<LineChatThreadUser[]>([]);
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'needs_reply' | 'leads' | 'students'>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [totalUnread, setTotalUnread] = useState(0);
    const [totalNeedsReply, setTotalNeedsReply] = useState(0);

    // 選択中ユーザー & チャット履歴状態
    const [selectedLineUserId, setSelectedLineUserId] = useState<string | null>(initialLineUserId || null);
    const [messages, setMessages] = useState<LineChatMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);

    // モバイル表示モード ('list' | 'chat' | 'profile') & 右ペイン開閉
    const [mobilePane, setMobilePane] = useState<'list' | 'chat' | 'profile'>('list');
    const [showRightPane, setShowRightPane] = useState(true);

    // メッセージ送信状態
    const [messageInput, setMessageInput] = useState('');
    const [showVariablePreview, setShowVariablePreview] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [confirmSendDialogOpen, setConfirmSendDialogOpen] = useState(false);

    // 右ペイン（顧客カルテ編集）状態
    const [editingDisplayName, setEditingDisplayName] = useState<string>('');
    const [editingStatus, setEditingStatus] = useState<string>('friend_only');
    const [editingNotes, setEditingNotes] = useState<string>('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [selectedNewTag, setSelectedNewTag] = useState<string>('');
    const [customTagInput, setCustomTagInput] = useState<string>('');
    const [isUpdatingTag, setIsUpdatingTag] = useState(false);
    const [copiedLineId, setCopiedLineId] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // 選択中のスレッドユーザーオブジェクト
    const selectedUser = useMemo(
        () => threads.find(t => t.lineUserId === selectedLineUserId) || null,
        [threads, selectedLineUserId]
    );

    // 標準タグ＋付与済みカスタムタグを統合したフィルタ選択肢
    const filterTagOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const st of STANDARD_TAG_OPTIONS) {
            map.set(st.value, st.label);
        }
        for (const t of threads) {
            for (const tag of t.tags || []) {
                if (!map.has(tag)) {
                    map.set(tag, TAG_DISPLAY_MAP[tag] || tag);
                }
            }
        }
        if (tagFilter && tagFilter !== 'all' && !map.has(tagFilter)) {
            map.set(tagFilter, TAG_DISPLAY_MAP[tagFilter] || tagFilter);
        }
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [threads, tagFilter]);

    const isSelectedTestTaro = useMemo(() => {
        if (!selectedUser) return false;
        return (
            selectedUser.lineUserId === TEST_TARO_LINE_USER_ID ||
            selectedUser.studentNumber === TEST_TARO_STUDENT_NUMBER
        );
    }, [selectedUser]);

    // スレッド一覧取得
    const fetchThreads = useCallback(async (silent = false) => {
        if (!silent) setIsLoadingThreads(true);
        try {
            const res = await getLineChatThreadsAction({
                searchQuery,
                filterMode,
                statusFilter,
                tagFilter,
            });
            if (res.success) {
                setThreads(res.threads);
                setTotalUnread(res.totalUnreadCount);
                setTotalNeedsReply(res.totalNeedsReplyCount);
                onUnreadCountChange?.(res.totalUnreadCount, res.totalNeedsReplyCount);

                // 初回ロード時に未選択ならテスト太郎または先頭ユーザーを選択
                if (!selectedLineUserId && res.threads.length > 0) {
                    const targetInitial = initialLineUserId
                        ? res.threads.find(t => t.lineUserId === initialLineUserId)
                        : (res.threads.find(t => t.unreadCount > 0 || t.needsReply) ||
                           res.threads.find(t => t.lineUserId === TEST_TARO_LINE_USER_ID) ||
                           res.threads[0]);
                    if (targetInitial) {
                        setSelectedLineUserId(targetInitial.lineUserId);
                    }
                }
            } else if (!silent) {
                toast.error(res.error || 'トーク一覧の取得に失敗しました');
            }
        } catch (err) {
            console.error('[IndividualChatTab] fetchThreads error:', err);
        } finally {
            if (!silent) setIsLoadingThreads(false);
        }
    }, [searchQuery, filterMode, statusFilter, tagFilter, selectedLineUserId, initialLineUserId, onUnreadCountChange]);

    // 選択ユーザーのチャット履歴取得
    const fetchChatHistory = useCallback(async (lineUserId: string, silent = false) => {
        if (!lineUserId) return;
        if (!silent) setIsLoadingMessages(true);
        try {
            const res = await getLineChatHistoryAction(lineUserId, true);
            if (res.success) {
                setMessages(res.messages);
                // 未読だったスレッドのローカル未読バッジを即時クリア
                setThreads(prev =>
                    prev.map(t => (t.lineUserId === lineUserId ? { ...t, unreadCount: 0 } : t))
                );
            } else if (!silent) {
                toast.error(res.error || 'チャット履歴の取得に失敗しました');
            }
        } catch (err) {
            console.error('[IndividualChatTab] fetchChatHistory error:', err);
        } finally {
            if (!silent) setIsLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        fetchThreads();
    }, [fetchThreads]);

    useEffect(() => {
        if (initialLineUserId && initialLineUserId !== selectedLineUserId) {
            setSelectedLineUserId(initialLineUserId);
            setMobilePane('chat');
        }
    }, [initialLineUserId]);

    // ユーザー切り替え時に履歴取得＆右ペイン初期値セット
    useEffect(() => {
        if (selectedLineUserId) {
            fetchChatHistory(selectedLineUserId);
        } else {
            setMessages([]);
        }
    }, [selectedLineUserId, fetchChatHistory]);

    useEffect(() => {
        if (selectedUser) {
            setEditingDisplayName(selectedUser.fullName || '');
            setEditingStatus(selectedUser.status || 'friend_only');
            setEditingNotes(selectedUser.notes || '');
        }
    }, [selectedUser?.lineUserId, selectedUser?.fullName, selectedUser?.status, selectedUser?.notes]);

    // チャット履歴更新時に最下部へスクロール
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length, selectedLineUserId]);

    // 15秒ごとのバックグラウンド自動更新（新着メッセージのリアルタイム反映）
    useEffect(() => {
        const timer = setInterval(() => {
            fetchThreads(true);
            if (selectedLineUserId) {
                fetchChatHistory(selectedLineUserId, true);
            }
        }, 15000);
        return () => clearInterval(timer);
    }, [fetchThreads, fetchChatHistory, selectedLineUserId]);

    // 変数置換プレビュー計算
    const previewRenderedText = useMemo(() => {
        if (!messageInput.trim() || !selectedUser) return '';
        const trialUrl = 'https://liff.line.me/2009159689-dWjvcfS7';
        return messageInput
            .replace(/[{｛]{1,2}\s*name\s*[}｝]{1,2}/gi, selectedUser.fullName || 'お客様')
            .replace(/[{｛]{1,2}\s*coach_name\s*[}｝]{1,2}/gi, selectedUser.coachName || '担当コーチ')
            .replace(/[{｛]{1,2}\s*area\s*[}｝]{1,2}/gi, selectedUser.area || 'ご希望エリア')
            .replace(/[{｛]{1,2}\s*plan_name\s*[}｝]{1,2}/gi, selectedUser.planName || 'スイムパートナーズ')
            .replace(/[{｛]{1,2}\s*student_number\s*[}｝]{1,2}/gi, selectedUser.studentNumber || '')
            .replace(/[{｛]{1,2}\s*trial_url\s*[}｝]{1,2}/gi, trialUrl);
    }, [messageInput, selectedUser]);

    // 変数・定型文挿入ハンドラ
    const handleInsertText = (snippet: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setMessageInput(prev => prev + snippet);
            return;
        }
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const nextVal = messageInput.slice(0, start) + snippet + messageInput.slice(end);
        setMessageInput(nextVal);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + snippet.length, start + snippet.length);
        }, 10);
    };

    // メッセージ送信実行
    const executeSendMessage = async (asTestPreview = false) => {
        if (!selectedUser || !messageInput.trim()) return;

        setIsSending(true);
        setConfirmSendDialogOpen(false);
        try {
            const trialUrl = 'https://liff.line.me/2009159689-dWjvcfS7';
            const res = await sendDirectLineChatMessageAction({
                lineUserId: selectedUser.lineUserId,
                studentId: selectedUser.studentId,
                studentNumber: selectedUser.studentNumber,
                studentName: selectedUser.fullName,
                rawMessage: messageInput,
                variables: {
                    name: selectedUser.fullName,
                    coach_name: selectedUser.coachName || '担当コーチ',
                    area: selectedUser.area || 'ご希望エリア',
                    plan_name: selectedUser.planName || 'スイムパートナーズ',
                    student_number: selectedUser.studentNumber || '',
                    trial_date: selectedUser.trialDate || '',
                    trial_url: trialUrl,
                },
                isTestPreview: asTestPreview,
            });

            if (res.success) {
                toast.success(`${selectedUser.fullName} 様へLINEメッセージを送信しました`);
                setMessageInput('');
                if (res.chatMessage) {
                    setMessages(prev => [...prev, res.chatMessage!]);
                } else {
                    await fetchChatHistory(selectedUser.lineUserId, true);
                }
                await fetchThreads(true);
                onDeliverySuccess?.();
            } else {
                toast.error('送信に失敗しました: ' + (res.error || '不明なエラー'));
            }
        } catch (err: any) {
            toast.error('送信中にエラーが発生しました: ' + (err?.message || ''));
        } finally {
            setIsSending(false);
        }
    };

    // 送信ボタンクリックハンドラ（テスト太郎は即時送信、一般顧客は安全確認ダイアログ）
    const handleSendClick = () => {
        if (!selectedUser || !messageInput.trim()) return;
        if (isSelectedTestTaro) {
            executeSendMessage(false);
        } else {
            setConfirmSendDialogOpen(true);
        }
    };

    // 要対応フラグ切り替え
    const handleToggleNeedsReply = async () => {
        if (!selectedUser) return;
        const nextVal = !selectedUser.needsReply;
        try {
            const res = await toggleLineChatNeedsReplyAction(selectedUser.lineUserId, nextVal);
            if (res.success) {
                toast.success(nextVal ? '「要対応」に設定しました' : '「対応済み」に変更しました');
                await fetchThreads(true);
            } else {
                toast.error(res.error || '更新に失敗しました');
            }
        } catch {
            toast.error('更新中にエラーが発生しました');
        }
    };

    // 顧客カルテ（表示名・ステータス・メモ）保存
    const handleSaveProfile = async (stopStepDelivery?: boolean) => {
        if (!selectedUser) return;
        setIsSavingProfile(true);
        try {
            const res = await updateLineChatUserProfileAction({
                lineUserId: selectedUser.lineUserId,
                studentId: selectedUser.studentId,
                customDisplayName: editingDisplayName.trim() || undefined,
                status: editingStatus,
                notes: editingNotes,
                stopStepDelivery,
            });
            if (res.success) {
                toast.success('顧客カルテ情報を保存しました');
                await fetchThreads(true);
            } else {
                toast.error(res.error || '保存に失敗しました');
            }
        } catch {
            toast.error('保存中にエラーが発生しました');
        } finally {
            setIsSavingProfile(false);
        }
    };

    // タグ追加ハンドラ
    const handleAddTag = async (tagToAdd: string) => {
        const cleanTag = tagToAdd.trim();
        if (!selectedUser || !cleanTag) return;
        setIsUpdatingTag(true);
        try {
            const res = await assignTagToUserAction(selectedUser.lineUserId, cleanTag, {
                category: 'custom',
                displayName: selectedUser.fullName,
                studentId: selectedUser.studentId || undefined,
            });
            if (res.success) {
                toast.success(`タグ「${TAG_DISPLAY_MAP[cleanTag] || cleanTag}」を付与しました`);
                setCustomTagInput('');
                setSelectedNewTag('');
                await fetchThreads(true);
            } else {
                toast.error(res.error || 'タグ付与に失敗しました');
            }
        } catch {
            toast.error('タグ付与中にエラーが発生しました');
        } finally {
            setIsUpdatingTag(false);
        }
    };

    // タグ削除ハンドラ
    const handleRemoveTag = async (tagToRemove: string) => {
        if (!selectedUser) return;
        setIsUpdatingTag(true);
        try {
            const res = await removeTagFromUserAction(selectedUser.lineUserId, tagToRemove);
            if (res.success) {
                toast.success(`タグ「${TAG_DISPLAY_MAP[tagToRemove] || tagToRemove}」を解除しました`);
                await fetchThreads(true);
            } else {
                toast.error(res.error || 'タグ解除に失敗しました');
            }
        } catch {
            toast.error('タグ解除中にエラーが発生しました');
        } finally {
            setIsUpdatingTag(false);
        }
    };

    // 日時フォーマットヘルパー
    const formatShortTime = (iso?: string | null) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            const now = new Date();
            const isToday =
                d.getFullYear() === now.getFullYear() &&
                d.getMonth() === now.getMonth() &&
                d.getDate() === now.getDate();
            if (isToday) {
                return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
        } catch {
            return '';
        }
    };

    const formatBubbleTime = (iso?: string | null) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const formatDateSeparator = (iso?: string | null) => {
        if (!iso) return '';
        try {
            return new Date(iso).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
            });
        } catch {
            return '';
        }
    };

    const getStatusBadgeStyle = (status: string) => {
        switch (status) {
            case 'inquired':
                return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300';
            case 'friend_only':
                return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300';
            case 'trial_done':
                return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300';
            case 'active':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300';
            case 'applied':
            case 'trial_pending':
            case 'trial_confirmed':
                return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300';
            default:
                return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* 3ペイン メインコンテナ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 h-[760px]">
                {/* ============================================================
                    左ペイン: 友だち・生徒スレッド一覧 (lg:col-span-4 or 3)
                   ============================================================ */}
                <div
                    className={`${
                        mobilePane !== 'list' ? 'hidden lg:flex' : 'flex'
                    } ${
                        showRightPane ? 'lg:col-span-3' : 'lg:col-span-4'
                    } flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 h-full overflow-hidden`}
                >
                    {/* 左ペインヘッダー & 検索バー */}
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4 text-[#06C755]" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                    個別トーク一覧
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                                    {threads.length}
                                </Badge>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => fetchThreads(false)}
                                disabled={isLoadingThreads}
                                className="h-7 w-7 text-slate-500 hover:text-slate-800"
                                title="一覧を最新に更新"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThreads ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {/* 検索ボックス */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="名前・会員番号(0035)・本文検索..."
                                className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* クイックフィルタピル（すべて / 要対応 / リード / 生徒） */}
                        <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setFilterMode('all')}
                                className={`text-[10px] font-semibold py-1 rounded-md transition-all ${
                                    filterMode === 'all'
                                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                すべて
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMode('needs_reply')}
                                className={`text-[10px] font-semibold py-1 rounded-md transition-all flex items-center justify-center gap-0.5 ${
                                    filterMode === 'needs_reply'
                                        ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                                }`}
                            >
                                要対応
                                {totalNeedsReply > 0 && (
                                    <span className="bg-rose-500 text-white text-[9px] px-1 rounded-full leading-tight">
                                        {totalNeedsReply}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMode('leads')}
                                className={`text-[10px] font-semibold py-1 rounded-md transition-all ${
                                    filterMode === 'leads'
                                        ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                未申込
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMode('students')}
                                className={`text-[10px] font-semibold py-1 rounded-md transition-all ${
                                    filterMode === 'students'
                                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                生徒
                            </button>
                        </div>

                        {/* ステータス・タグ詳細絞り込み */}
                        <div className="grid grid-cols-2 gap-1.5">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-7 text-[11px] px-2 bg-slate-50 dark:bg-slate-800">
                                    <SelectValue placeholder="ステータス" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">全ステータス</SelectItem>
                                    {STATUS_OPTIONS.map(st => (
                                        <SelectItem key={st.value} value={st.value} className="text-xs">
                                            {st.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={tagFilter} onValueChange={setTagFilter}>
                                <SelectTrigger className="h-7 text-[11px] px-2 bg-slate-50 dark:bg-slate-800">
                                    <SelectValue placeholder="タグ絞り込み" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all" className="text-xs">全タグ</SelectItem>
                                    {filterTagOptions.map(tg => (
                                        <SelectItem key={tg.value} value={tg.value} className="text-xs">
                                            {tg.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* スレッドリスト本体 */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/70">
                        {isLoadingThreads ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#06C755]" />
                                LINE友だち・生徒リストを読み込み中...
                            </div>
                        ) : threads.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                                <p>条件に一致するユーザーが見つかりません。</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterMode('all');
                                        setStatusFilter('all');
                                        setTagFilter('all');
                                    }}
                                    className="text-xs h-7"
                                >
                                    フィルタをリセット
                                </Button>
                            </div>
                        ) : (
                            threads.map((thread) => {
                                const isSelected = thread.lineUserId === selectedLineUserId;
                                const isTestTaro =
                                    thread.lineUserId === TEST_TARO_LINE_USER_ID ||
                                    thread.studentNumber === TEST_TARO_STUDENT_NUMBER;

                                return (
                                    <button
                                        key={thread.lineUserId}
                                        type="button"
                                        onClick={() => {
                                            setSelectedLineUserId(thread.lineUserId);
                                            setMobilePane('chat');
                                        }}
                                        className={`w-full text-left p-3 transition-colors flex items-start gap-2.5 ${
                                            isSelected
                                                ? 'bg-emerald-50/90 dark:bg-emerald-950/30 border-l-4 border-l-[#06C755]'
                                                : 'hover:bg-white dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        {/* アバターアイコン */}
                                        <div className="relative shrink-0 mt-0.5">
                                            <div
                                                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    isTestTaro
                                                        ? 'bg-emerald-600 text-white'
                                                        : thread.unreadCount > 0
                                                            ? 'bg-rose-600 text-white'
                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                {(thread.fullName || 'L').slice(0, 1)}
                                            </div>
                                            {thread.unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs">
                                                    {thread.unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        {/* ユーザー名・ステータス・最新メッセージ抜粋 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <div className="flex items-center gap-1 min-w-0">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                        {thread.fullName}
                                                    </span>
                                                    {thread.studentNumber && (
                                                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                                            #{thread.studentNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                                    {formatShortTime(thread.lastMessageAt)}
                                                </span>
                                            </div>

                                            {/* ステータス＆要対応バッジ */}
                                            <div className="flex items-center flex-wrap gap-1 mt-1">
                                                {isTestTaro && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                                                        🧪 テスト用 #0035
                                                    </span>
                                                )}
                                                {(thread.needsReply || thread.status === 'inquired') && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                                                        要対応
                                                    </span>
                                                )}
                                                <span
                                                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${getStatusBadgeStyle(
                                                        thread.status
                                                    )}`}
                                                >
                                                    {thread.statusLabel}
                                                </span>
                                                {thread.tags.slice(0, 1).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 truncate max-w-[90px]"
                                                    >
                                                        #{TAG_DISPLAY_MAP[tag] || tag}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* 最新メッセージプレビュー */}
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                                                {thread.lastMessageText ? (
                                                    <>
                                                        {thread.lastMessageDirection === 'outbound' && (
                                                            <span className="text-emerald-600 font-medium mr-1">↩︎</span>
                                                        )}
                                                        {thread.lastMessageText}
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400 italic">メッセージ履歴なし</span>
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ============================================================
                    中央ペイン: LINE風チャットタイムライン & 個別送信フォーム
                   ============================================================ */}
                <div
                    className={`${
                        mobilePane !== 'chat' ? 'hidden lg:flex' : 'flex'
                    } ${
                        showRightPane ? 'lg:col-span-6' : 'lg:col-span-8'
                    } flex-col h-full overflow-hidden bg-white dark:bg-slate-900`}
                >
                    {!selectedUser ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                            <MessageSquare className="w-10 h-10 mb-3 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">
                                左のリストからトーク相手を選択してください
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                生徒や公式LINE友だちとの1対1チャット履歴の確認・個別メッセージ送信が行えます。
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* チャットヘッダー */}
                            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900 shrink-0">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setMobilePane('list')}
                                        className="lg:hidden h-8 w-8 shrink-0"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                {selectedUser.fullName} 様
                                            </h3>
                                            {selectedUser.studentNumber && (
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    #{selectedUser.studentNumber}
                                                </Badge>
                                            )}
                                            <span
                                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(
                                                    selectedUser.status
                                                )}`}
                                            >
                                                {selectedUser.statusLabel}
                                            </span>
                                            {isSelectedTestTaro && (
                                                <Badge className="bg-emerald-600 text-white text-[10px]">
                                                    🧪 テスト太郎（実送信テスト安全対象）
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                                            {selectedUser.lineDisplayName &&
                                                selectedUser.lineDisplayName !== selectedUser.fullName && (
                                                    <span>LINE名: {selectedUser.lineDisplayName}</span>
                                                )}
                                            <span>エリア: {selectedUser.area || '未設定'}</span>
                                            {selectedUser.coachName && <span>担当: {selectedUser.coachName}</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* チャットヘッダー右側操作ボタン */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        type="button"
                                        variant={selectedUser.needsReply ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={handleToggleNeedsReply}
                                        className={`h-8 text-xs ${
                                            selectedUser.needsReply
                                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                                : 'text-slate-600'
                                        }`}
                                    >
                                        {selectedUser.needsReply ? (
                                            <>
                                                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                                                要対応中（対応済にする）
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                対応済（要対応にする）
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => fetchChatHistory(selectedUser.lineUserId, false)}
                                        disabled={isLoadingMessages}
                                        className="h-8 w-8 text-slate-500"
                                        title="トーク履歴を更新"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin' : ''}`} />
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMobilePane('profile')}
                                        className="lg:hidden h-8 text-xs"
                                    >
                                        <User className="w-3.5 h-3.5 mr-1" />
                                        カルテ
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowRightPane(prev => !prev)}
                                        className="hidden lg:inline-flex h-8 w-8 text-slate-500"
                                        title={showRightPane ? '顧客カルテを閉じる' : '顧客カルテを開く'}
                                    >
                                        {showRightPane ? (
                                            <PanelRightClose className="w-4 h-4" />
                                        ) : (
                                            <PanelRightOpen className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* タイムライン表示エリア (LINEトーク画面風背景) */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#eef2f6] dark:bg-slate-950/80">
                                {isLoadingMessages ? (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#06C755]" />
                                        トーク履歴を読み込み中...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                                        <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-2xs mb-3">
                                            <MessageSquare className="w-6 h-6 text-[#06C755]" />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {selectedUser.fullName} 様とのトーク履歴はまだありません
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                                            下のメッセージ入力欄から個別LINEメッセージを送信するか、ユーザーから公式LINEへ返信が届くとここに吹き出し形式で表示されます。
                                        </p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const isInbound = msg.direction === 'inbound';
                                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                        const currentDateLabel = formatDateSeparator(msg.created_at);
                                        const prevDateLabel = prevMsg ? formatDateSeparator(prevMsg.created_at) : '';
                                        const showDateSeparator = currentDateLabel !== prevDateLabel;

                                        const isDirectReply =
                                            msg.message_type === 'direct_chat' || msg.sender_type === 'admin';

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {showDateSeparator && currentDateLabel && (
                                                    <div className="flex justify-center my-2">
                                                        <span className="text-[10px] font-medium bg-slate-700/20 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-0.5 rounded-full">
                                                            {currentDateLabel}
                                                        </span>
                                                    </div>
                                                )}

                                                {isInbound ? (
                                                    /* ユーザーからの受信メッセージ（左側・白吹き出し） */
                                                    <div className="flex items-start gap-2 max-w-[85%]">
                                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0 mt-1 shadow-2xs">
                                                            {(selectedUser.fullName || 'U').slice(0, 1)}
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-slate-500 mb-0.5 ml-1">
                                                                {msg.sender_label || selectedUser.fullName}
                                                            </div>
                                                            <div className="flex items-end gap-1.5">
                                                                <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs border border-slate-200/80 dark:border-slate-700">
                                                                    {msg.message_text}
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                                                    {formatBubbleTime(msg.created_at)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* システム・管理者からの送信メッセージ（右側・緑/青吹き出し） */
                                                    <div className="flex flex-col items-end max-w-[85%] ml-auto">
                                                        <div className="flex items-center gap-1 mb-0.5 mr-1">
                                                            {msg.message_type === 'broadcast' && (
                                                                <Megaphone className="w-3 h-3 text-blue-600" />
                                                            )}
                                                            {msg.message_type === 'step_message' && (
                                                                <Layers className="w-3 h-3 text-purple-600" />
                                                            )}
                                                            {msg.message_type === 'cart_recovery' && (
                                                                <ShoppingBag className="w-3 h-3 text-amber-600" />
                                                            )}
                                                            {msg.message_type === 'test_preview' && (
                                                                <FlaskConical className="w-3 h-3 text-emerald-600" />
                                                            )}
                                                            <span className="text-[10px] font-medium text-slate-500">
                                                                {msg.sender_label || '事務局'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-end gap-1.5">
                                                            <div className="flex flex-col items-end text-[10px] text-slate-400 font-mono shrink-0">
                                                                {msg.status === 'failed' ? (
                                                                    <span className="text-rose-600 font-sans font-bold">
                                                                        送信失敗
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-slate-400 font-sans text-[9px]">
                                                                        送信済
                                                                    </span>
                                                                )}
                                                                <span>{formatBubbleTime(msg.created_at)}</span>
                                                            </div>
                                                            <div
                                                                className={`rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs whitespace-pre-wrap leading-relaxed shadow-2xs ${
                                                                    msg.status === 'failed'
                                                                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                                                        : isDirectReply
                                                                            ? 'bg-[#06C755] text-white'
                                                                            : 'bg-emerald-700/90 text-white'
                                                                }`}
                                                            >
                                                                {msg.message_text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* 下部メッセージ作成・個別送信コンポーザー */}
                            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
                                {/* テスト太郎安全バナー */}
                                {isSelectedTestTaro && (
                                    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                                        <span className="flex items-center gap-1.5 font-semibold">
                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                            会員番号0035（テスト太郎）選択中：そのまま安全に実送信テストを行えます
                                        </span>
                                    </div>
                                )}

                                {/* 定型文選択 & 変数挿入ツールバー */}
                                <div className="flex items-center flex-wrap gap-1.5 justify-between">
                                    <div className="flex items-center flex-wrap gap-1">
                                        {/* 定型文セレクト */}
                                        <Select
                                            value=""
                                            onValueChange={(tplId) => {
                                                const tpl = QUICK_REPLY_TEMPLATES.find(t => t.id === tplId);
                                                if (tpl) {
                                                    setMessageInput(prev => (prev ? `${prev}\n${tpl.text}` : tpl.text));
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-7 text-[11px] w-44 bg-slate-50 dark:bg-slate-800">
                                                <FileText className="w-3 h-3 mr-1 text-blue-600" />
                                                <SelectValue placeholder="定型文を挿入..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {QUICK_REPLY_TEMPLATES.map(tpl => (
                                                    <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                                                        {tpl.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* 変数ワンクリック挿入ボタン群 */}
                                        {INSERTABLE_VARIABLES.map(v => (
                                            <button
                                                key={v.key}
                                                type="button"
                                                onClick={() => handleInsertText(v.key)}
                                                className="text-[10px] px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
                                                title={`${v.key} をカーソル位置に挿入`}
                                            >
                                                +{v.label}
                                            </button>
                                        ))}
                                    </div>

                                    {messageInput.includes('{') && (
                                        <button
                                            type="button"
                                            onClick={() => setShowVariablePreview(prev => !prev)}
                                            className="text-[10px] text-blue-600 hover:underline font-medium"
                                        >
                                            {showVariablePreview ? 'プレビューを隠す' : '変数置換プレビュー'}
                                        </button>
                                    )}
                                </div>

                                {/* 変数置換リアルタイムプレビュー */}
                                {showVariablePreview && previewRenderedText && (
                                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                        <span className="text-[10px] font-bold text-blue-600 block mb-0.5">
                                            【送信時プレビュー】
                                        </span>
                                        {previewRenderedText}
                                    </div>
                                )}

                                {/* テキスト入力欄 + 送信ボタン */}
                                <div className="flex items-end gap-2">
                                    <Textarea
                                        ref={textareaRef}
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSendClick();
                                            }
                                        }}
                                        placeholder={`${selectedUser.fullName} 様へ個別メッセージを入力... (Cmd+Enter / Ctrl+Enter で送信)`}
                                        rows={3}
                                        className="text-xs resize-none flex-1 bg-slate-50 dark:bg-slate-800 focus:bg-white"
                                    />
                                    <div className="flex flex-col gap-1.5 shrink-0">
                                        <Button
                                            type="button"
                                            onClick={handleSendClick}
                                            disabled={isSending || !messageInput.trim()}
                                            className="bg-[#06C755] hover:bg-[#05b34c] text-white font-bold text-xs h-10 px-4 shadow-xs"
                                        >
                                            {isSending ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-3.5 h-3.5 mr-1.5" />
                                                    LINE送信
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ============================================================
                    右ペイン: Lステップ風 顧客カルテ・タグ・メモ管理 (lg:col-span-3)
                   ============================================================ */}
                {showRightPane && (
                    <div
                        className={`${
                            mobilePane !== 'profile' ? 'hidden lg:flex' : 'flex'
                        } lg:col-span-3 flex-col border-l border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 h-full overflow-y-auto`}
                    >
                        {!selectedUser ? (
                            <div className="p-6 text-center text-xs text-slate-400">
                                ユーザーを選択すると顧客カルテが表示されます
                            </div>
                        ) : (
                            <div className="p-4 space-y-5">
                                {/* モバイル用戻るボタン */}
                                <div className="flex items-center justify-between lg:hidden pb-2 border-b border-slate-200">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setMobilePane('chat')}
                                        className="h-8 text-xs"
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" />
                                        トーク画面へ戻る
                                    </Button>
                                    <span className="text-xs font-bold text-slate-700">顧客カルテ詳細</span>
                                </div>

                                {/* 1. 基本プロフィールカード */}
                                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                {selectedUser.fullName}
                                            </div>
                                            {selectedUser.fullNameKana && (
                                                <div className="text-[10px] text-slate-400">
                                                    {selectedUser.fullNameKana}
                                                </div>
                                            )}
                                        </div>
                                        {selectedUser.studentId && (
                                            <Link
                                                href={`/customers/${selectedUser.studentId}`}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline shrink-0"
                                            >
                                                顧客詳細
                                                <ExternalLink className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">会員番号</span>
                                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                                                {selectedUser.studentNumber ? `#${selectedUser.studentNumber}` : '未発行(リード)'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">LINE表示名</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                                                {selectedUser.lineDisplayName || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">希望/受講エリア</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                                {selectedUser.area || '未設定'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">担当コーチ</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">
                                                {selectedUser.coachName || '未割当'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* LINE User ID コピー行 */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                                        <span className="text-[10px] font-mono text-slate-400 truncate">
                                            ID: {selectedUser.lineUserId}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedUser.lineUserId);
                                                setCopiedLineId(true);
                                                toast.success('LINE User IDをコピーしました');
                                                setTimeout(() => setCopiedLineId(false), 2000);
                                            }}
                                            className="text-[10px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5 shrink-0"
                                        >
                                            {copiedLineId ? (
                                                <Check className="w-3 h-3 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3 h-3" />
                                            )}
                                            コピー
                                        </button>
                                    </div>
                                </div>

                                {/* 2. ステータス変更 & 自動ステップ配信制御 */}
                                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                                        ステータス・ステップ配信管理
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-slate-500 block">
                                            管理用表示名（お名前）
                                        </label>
                                        <Input
                                            value={editingDisplayName}
                                            onChange={e => setEditingDisplayName(e.target.value)}
                                            placeholder="表示名・生徒名を入力..."
                                            className="h-8 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-slate-500 block">
                                            顧客ステータス
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <Select value={editingStatus} onValueChange={setEditingStatus}>
                                                <SelectTrigger className="h-8 text-xs flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {STATUS_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleSaveProfile()}
                                                disabled={
                                                    isSavingProfile ||
                                                    (editingStatus === selectedUser.status &&
                                                        editingDisplayName.trim() === (selectedUser.fullName || '').trim())
                                                }
                                                className="h-8 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                更新
                                            </Button>
                                        </div>
                                    </div>

                                    {/* 友だち追加ステップ配信の稼働状態と停止・再開ボタン */}
                                    {selectedUser.stepStage !== null && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                                            <div className="text-[11px]">
                                                <span className="text-slate-400 block text-[10px]">自動ステップ配信</span>
                                                {selectedUser.stepStage >= 0 && selectedUser.stepStage < 3 ? (
                                                    <span className="text-emerald-600 font-semibold">
                                                        稼働中 (Step {selectedUser.stepStage + 1} 待機)
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 font-medium">
                                                        停止済 / 完了
                                                    </span>
                                                )}
                                            </div>
                                            {selectedUser.stepStage >= 0 && selectedUser.stepStage < 3 ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSaveProfile(true)}
                                                    disabled={isSavingProfile}
                                                    className="h-7 text-[10px] text-rose-600 border-rose-200 hover:bg-rose-50"
                                                >
                                                    <Ban className="w-3 h-3 mr-1" />
                                                    ステップ停止
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSaveProfile(false)}
                                                    disabled={isSavingProfile}
                                                    className="h-7 text-[10px] text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                                >
                                                    <Play className="w-3 h-3 mr-1" />
                                                    再開
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 3. Lステップ風 付与タグ管理 */}
                                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5 text-indigo-600" />
                                        付与タグ管理
                                    </div>

                                    {/* 現在のタグ一覧 */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedUser.tags.length === 0 ? (
                                            <span className="text-[11px] text-slate-400">付与されているタグはありません</span>
                                        ) : (
                                            selectedUser.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                                                >
                                                    #{TAG_DISPLAY_MAP[tag] || tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(tag)}
                                                        disabled={isUpdatingTag}
                                                        className="text-indigo-400 hover:text-rose-600"
                                                        title="タグを削除"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>

                                    {/* 標準タグ追加セレクト */}
                                    <div className="space-y-1.5 pt-1">
                                        <Select
                                            value={selectedNewTag}
                                            onValueChange={(val) => {
                                                setSelectedNewTag(val);
                                                handleAddTag(val);
                                            }}
                                            disabled={isUpdatingTag}
                                        >
                                            <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="+ 標準タグを選択して追加..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STANDARD_TAG_OPTIONS.map(opt => (
                                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* カスタムタグ入力追加 */}
                                        <div className="flex items-center gap-1.5">
                                            <Input
                                                value={customTagInput}
                                                onChange={(e) => setCustomTagInput(e.target.value)}
                                                placeholder="カスタムタグ名を入力..."
                                                className="h-8 text-xs flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddTag(customTagInput)}
                                                disabled={isUpdatingTag || !customTagInput.trim()}
                                                className="h-8 text-xs px-2.5"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. 対応メモ・カルテノート */}
                                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                            対応メモ・引き継ぎ事項
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => handleSaveProfile()}
                                            disabled={isSavingProfile}
                                            className="h-7 text-[11px] px-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                                        >
                                            {isSavingProfile ? (
                                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                            ) : (
                                                <Save className="w-3 h-3 mr-1" />
                                            )}
                                            メモ保存
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={editingNotes}
                                        onChange={(e) => setEditingNotes(e.target.value)}
                                        placeholder="ご希望の曜日・プール・お子様の泳力や相談内容などを自由に記録できます..."
                                        rows={4}
                                        className="text-xs bg-slate-50 dark:bg-slate-800"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 一般顧客への個別メッセージ送信 確認ダイアログ（誤送信防止ガード） */}
            <Dialog open={confirmSendDialogOpen} onOpenChange={setConfirmSendDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Send className="w-4 h-4 text-[#06C755]" />
                            個別LINEメッセージ送信の確認
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            以下の顧客アカウントへ1対1のLINEメッセージを即時送信します。よろしいですか？
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-3 py-2 text-xs">
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                                <div>
                                    <span className="text-slate-500">送信先: </span>
                                    <span className="font-bold text-slate-900">
                                        {selectedUser.fullName} 様
                                    </span>
                                    {selectedUser.studentNumber && (
                                        <span className="ml-1 font-mono text-slate-500">
                                            (#{selectedUser.studentNumber})
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-slate-500">ステータス: </span>
                                    <span className="font-medium text-slate-700">{selectedUser.statusLabel}</span>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-slate-600">送信されるメッセージ本文:</span>
                                <div className="p-3 rounded-xl bg-[#06C755]/10 border border-[#06C755]/30 text-slate-900 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                                    {previewRenderedText || messageInput}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmSendDialogOpen(false)}
                            disabled={isSending}
                        >
                            キャンセル
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => executeSendMessage(false)}
                            disabled={isSending}
                            className="bg-[#06C755] hover:bg-[#05b34c] text-white font-bold"
                        >
                            {isSending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                                <Send className="w-3.5 h-3.5 mr-1" />
                            )}
                            送信を実行する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
