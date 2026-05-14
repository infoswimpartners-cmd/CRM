import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { registerAndEntryTrioSlot, getTrioStudentProfile } from '@/actions/trio_matching';
import { toast } from 'sonner';
import { useSession, signIn, getCsrfToken } from 'next-auth/react';
import { Loader2, Mail, User, Send, ArrowRight, CheckCircle2, Ticket, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TrioRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    slotId: string | null;
    onSuccess: () => void;
    isUserPaid?: boolean;
    isUserPending?: boolean;
    isPortalLoggedIn?: boolean;
    existingProfileData?: any;
}

export default function TrioRegistrationModal({ isOpen, onClose, slotId, onSuccess, isUserPaid = false, isUserPending = false, isPortalLoggedIn = false, existingProfileData }: TrioRegistrationModalProps) {
    const { data: session, status } = useSession();
    const [loading, setLoading] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [existingProfile, setExistingProfile] = useState<any>(existingProfileData || null);
    const [checkingProfile, setCheckingProfile] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const isAuthenticated = status === 'authenticated' || isPortalLoggedIn;
    const isAuthenticating = status === 'loading';

    // 既存プロフィールの取得・セット
    useEffect(() => {
        if (existingProfileData) {
            setExistingProfile(existingProfileData);
        } else if (isOpen && status === 'authenticated' && session?.user) {
            const fetchProfile = async () => {
                setCheckingProfile(true);
                try {
                    const res = await getTrioStudentProfile((session.user as any).id);
                    if (res.student) {
                        setExistingProfile(res.student);
                    }
                } catch (err) {
                    console.error('Failed to fetch profile:', err);
                } finally {
                    setCheckingProfile(false);
                }
            };
            fetchProfile();
        } else if (!isOpen) {
            setExistingProfile(null);
            setIsSuccess(false);
        }
    }, [isOpen, status, session, existingProfileData]);

    const handleCancel = async () => {
        if (!slotId) return;
        
        setIsCancelling(true);
        try {
            const { cancelTrioEntryByStudent } = await import('@/actions/trio_matching');
            const res = await cancelTrioEntryByStudent(slotId);
            if (res.success) {
                toast.success('キャンセルしました');
                onSuccess();
                onClose();
            } else {
                toast.error(res.error || 'キャンセルの処理に失敗しました');
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
        } finally {
            setIsCancelling(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!slotId) return;

        setLoading(true);
        const formData = new FormData(e.currentTarget);
        
        const data = {
            lastName: formData.get('lastName') as string || existingProfile?.full_name?.split(' ')[0] || '',
            firstName: formData.get('firstName') as string || existingProfile?.full_name?.split(' ')[1] || '',
            lastNameKana: formData.get('lastNameKana') as string || existingProfile?.full_name_kana?.split(' ')[0] || '',
            firstNameKana: formData.get('firstNameKana') as string || existingProfile?.full_name_kana?.split(' ')[1] || '',
            email: formData.get('email') as string || existingProfile?.contact_email || '',
            phone: formData.get('phone') as string || existingProfile?.contact_phone || '',
            birthDate: formData.get('birthDate') as string || existingProfile?.birth_date || '',
            swimmingLevel: formData.get('swimmingLevel') as string || '',
            concerns: formData.get('concerns') as string || '',
            lineUserId: (session?.user as any)?.id
        };

        try {
            const res = await registerAndEntryTrioSlot(slotId, data);
            if (res.success) {
                if (res.url) {
                    toast.loading('決済画面へ移動しています...');
                    window.location.href = res.url;
                } else {
                    setIsSuccess(true);
                    onSuccess();
                }
            } else {
                toast.error(res.error || 'エラーが発生しました');
            }
        } catch (error) {
            toast.error('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-slate-950 border-slate-800 shadow-[0_40px_120px_rgba(0,0,0,0.8)] rounded-[2rem] max-h-[90vh] overflow-y-auto">
                {isSuccess ? (
                    <div className="py-12 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 relative z-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white tracking-tighter">Entry Confirmed!</h2>
                            <p className="text-slate-400 text-sm font-bold">
                                セッションへのエントリーが完了しました。<br/>
                                詳細はダッシュボードからご確認いただけます。
                            </p>
                        </div>
                        <Button 
                            onClick={onClose}
                            className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20"
                        >
                            ダッシュボードに戻る
                        </Button>
                    </div>
                ) : (
                    <>
                <DialogHeader className="space-y-4 pt-4">
                    {(!isAuthenticated || isUserPaid || isUserPending) && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mx-auto shadow-sm">
                            {!isAuthenticated ? 'Login Required' : isUserPaid ? 'Active Entry' : 'Payment Pending'}
                        </div>
                    )}
                    <div className="space-y-1 text-center">
                        <DialogTitle className="text-2xl font-black tracking-tighter text-slate-100">
                            {isAuthenticated 
                                ? (isUserPaid ? '予約済み' : isUserPending ? '決済の完了' : existingProfile ? 'エントリー確認' : 'プロフィール登録') 
                                : '公式LINEでログイン'}
                        </DialogTitle>
                        <DialogDescription className="text-cyan-400 font-bold text-xs pt-1">
                            {isAuthenticated 
                                ? (isUserPaid ? 'このセッションの予約は完了しています。' : isUserPending ? '仮予約の期限（5分）が切れる前に決済を完了してください。' : existingProfile 
                                    ? `${existingProfile.full_name}様、エントリーを完了しますか？` 
                                    : '初回のみ、プロフィール情報の入力が必要です。') 
                                : '体験予約には公式LINEアカウントとの連携が必要です。'}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {!isAuthenticated ? (
                    <div className="py-10 space-y-8 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse">
                            <Send className="w-10 h-10 text-emerald-500" />
                        </div>
                        <Button 
                            className="w-full h-16 rounded-2xl bg-[#06C755] hover:bg-[#05b34d] text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl"
                            onClick={async () => {
                                try {
                                    const csrfToken = await getCsrfToken();
                                    if (!csrfToken) throw new Error('CSRFトークンの取得に失敗しました。');
                                    const form = document.createElement('form');
                                    form.method = 'POST';
                                    form.action = '/api/auth/signin/line';
                                    const csrfInput = document.createElement('input');
                                    csrfInput.type = 'hidden';
                                    csrfInput.name = 'csrfToken';
                                    csrfInput.value = csrfToken;
                                    const callbackInput = document.createElement('input');
                                    callbackInput.type = 'hidden';
                                    callbackInput.name = 'callbackUrl';
                                    callbackInput.value = window.location.href;
                                    form.appendChild(csrfInput);
                                    form.appendChild(callbackInput);
                                    document.body.appendChild(form);
                                    form.submit();
                                } catch (error: any) {
                                    console.error('LINE Login Error:', error);
                                    toast.error(error.message || 'LINEログインの開始に失敗しました。');
                                }
                            }}
                            disabled={isAuthenticating}
                        >
                            {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <span className="flex items-center gap-3">
                                    公式LINEでログインして進む
                                    <ArrowRight className="w-5 h-5" />
                                </span>
                            )}
                        </Button>
                        <p className="text-[10px] text-slate-500 font-bold text-center leading-relaxed">
                            ※ログイン後、この画面に戻ります。<br/>
                            登録済みの情報を利用してスムーズに予約できます。
                        </p>
                    </div>
                ) : checkingProfile ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                        <p className="text-xs text-slate-400 font-bold">プロフィールを確認中...</p>
                    </div>
                ) : isUserPaid ? (
                    <div className="py-6 space-y-8">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
                            <div className="flex items-center gap-3 text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-sm font-black tracking-widest uppercase">Booking Confirmed</span>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">お名前</p>
                                    <p className="text-sm font-bold text-slate-100">{existingProfile?.full_name} 様</p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold leading-relaxed px-1">
                                    セッションの詳細はダッシュボードまたは公式LINEからご確認いただけます。
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Button 
                                onClick={onClose}
                                className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-sm transition-all"
                            >
                                閉じる
                            </Button>
                            
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowCancelConfirm(true);
                                }}
                                disabled={isCancelling}
                                className="w-full py-2 text-[10px] font-black text-slate-600 hover:text-red-400 uppercase tracking-widest transition-colors flex items-center justify-center gap-2 group/cancel"
                            >
                                <span className="w-1 h-1 bg-slate-700 rounded-full group-hover/cancel:bg-red-400 transition-colors" />
                                エントリーをキャンセルする
                            </button>
                        </div>
                    </div>
                ) : showCancelConfirm ? (
                    /* キャンセル確認画面 */
                    <div className="py-12 flex flex-col items-center text-center space-y-8 animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <Trash2 className="w-10 h-10 text-rose-500" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-black text-white tracking-tighter">キャンセルしますか？</h2>
                            <p className="text-slate-400 text-xs font-bold leading-relaxed">
                                このエントリーを取り消します。<br/>
                                ※決済済みの場合は、後ほど運営より返金等についてご連絡いたします。
                            </p>
                        </div>
                        <div className="w-full space-y-3">
                            <Button 
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="w-full h-14 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-widest transition-all"
                            >
                                {isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'キャンセルを確定する'}
                            </Button>
                            <Button 
                                onClick={() => setShowCancelConfirm(false)}
                                disabled={isCancelling}
                                variant="ghost"
                                className="w-full h-12 text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest"
                            >
                                戻る
                            </Button>
                        </div>
                    </div>
                ) : isUserPending ? (
                    <div className="py-10 space-y-8 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center animate-pulse">
                            <Ticket className="w-10 h-10 text-amber-500" />
                        </div>
                        <div className="space-y-2 text-center">
                            <p className="text-sm font-bold text-slate-100">仮予約が保持されています</p>
                            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                                まだ決済が完了していません。<br/>
                                下のボタンから決済を完了させてください。
                            </p>
                        </div>
                        <form onSubmit={handleSubmit} className="w-full">
                            <Button 
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-amber-900/20"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <span className="flex items-center gap-3">
                                        決済を完了する (Stripeへ)
                                        <ArrowRight className="w-5 h-5" />
                                    </span>
                                )}
                            </Button>
                        </form>
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowCancelConfirm(true);
                            }}
                            className="text-[10px] font-black text-slate-600 hover:text-red-400 uppercase tracking-widest transition-colors"
                        >
                            キャンセルしてやり直す
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6 pt-4 pb-2">
                        {existingProfile && (
                            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6">
                                <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2">ログイン中のアカウント</p>
                                <p className="text-sm font-bold text-slate-100">{existingProfile.full_name} 様</p>
                                <p className="text-[10px] text-slate-500">{existingProfile.contact_email}</p>
                            </div>
                        )}
                        <div className="space-y-6">
                            {!existingProfile && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">苗字 (Last Name)</Label>
                                            <Input id="lastName" name="lastName" placeholder="山田" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 focus:ring-cyan-900 text-sm font-bold text-slate-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">名前 (First Name)</Label>
                                            <Input id="firstName" name="firstName" placeholder="太郎" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 focus:ring-cyan-900 text-sm font-bold text-slate-100" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="lastNameKana" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">ミョウジ (Kana)</Label>
                                            <Input id="lastNameKana" name="lastNameKana" placeholder="ヤマダ" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 focus:ring-cyan-900 text-sm font-bold text-slate-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="firstNameKana" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">ナマエ (Kana)</Label>
                                            <Input id="firstNameKana" name="firstNameKana" placeholder="タロウ" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 focus:ring-cyan-900 text-sm font-bold text-slate-100" />
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="swimmingLevel" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">水泳のレベル (Level)</Label>
                                <Select name="swimmingLevel" required>
                                    <SelectTrigger className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-sm font-bold text-slate-100">
                                        <SelectValue placeholder="レベルを選択してください" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 font-bold">
                                        <SelectItem value="初心者">初心者 (顔付け・浮く練習から)</SelectItem>
                                        <SelectItem value="初級">初級 (バタ足・クロール25m未満)</SelectItem>
                                        <SelectItem value="中級">中級 (4泳法25m完泳程度)</SelectItem>
                                        <SelectItem value="上級">上級 (4泳法50m以上・フォーム改善)</SelectItem>
                                        <SelectItem value="競泳">競泳 (タイム向上・大会出場レベル)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="concerns" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">現在のお悩み (Concerns)</Label>
                                <Textarea id="concerns" name="concerns" placeholder="例：クロールの息継ぎが上手くいかない、バタフライのうねりが苦手など" className="min-h-[100px] p-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-sm font-bold text-slate-100 placeholder:text-slate-600" />
                            </div>
                            {!existingProfile && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="birthDate" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">生年月日 (Birth)</Label>
                                            <Input id="birthDate" name="birthDate" type="date" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-sm font-bold text-slate-100 [color-scheme:dark]" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">電話番号 (Phone)</Label>
                                            <Input id="phone" name="phone" type="tel" placeholder="090-1234-5678" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-sm font-bold text-slate-100" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-2">メールアドレス (Email)</Label>
                                        <Input id="email" name="email" type="email" placeholder="example@mail.com" required className="h-12 px-4 rounded-xl bg-slate-900 border border-slate-800 focus:border-cyan-400 text-sm font-bold text-slate-100" />
                                    </div>
                                </>
                            )}
                        </div>

                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-black text-sm shadow-[0_10px_30px_rgba(8,145,178,0.3)] transition-all active:scale-[0.98] border-none"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <span className="flex items-center gap-2">
                                    <Send className="w-4 h-4" />
                                    {existingProfile ? 'この内容でエントリー（決済へ）' : '登録して決済画面へ'}
                                </span>
                            )}
                        </Button>
                    </form>
                )}
                </>
                )}
            </DialogContent>
        </Dialog>
    );
}
