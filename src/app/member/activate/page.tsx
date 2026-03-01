'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2, CheckCircle2, UserCheck, ShieldCheck, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { verifyMemberForActivation } from '@/actions/member/auth';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function MemberActivatePage() {
    const [step, setStep] = useState(1); // 1: Verify, 2: Set Password, 3: Success
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [verifiedData, setVerifiedData] = useState<{ studentId: string; fullName: string; email: string } | null>(null);

    const handleVerify = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;

        try {
            const result = await verifyMemberForActivation(email, phone);
            if (result.success && result.studentId) {
                setVerifiedData({
                    studentId: result.studentId,
                    fullName: result.fullName || '',
                    email: result.email || email
                });
                setStep(2);
                toast.success('本人確認が完了しました');
            } else {
                toast.error(result.message || '認証に失敗しました');
            }
        } catch (error) {
            toast.error('システムエラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            toast.error('パスワードが一致しません');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            toast.error('パスワードは8文字以上で設定してください');
            setLoading(false);
            return;
        }

        try {
            const supabase = createClient();

            // 1. Sign up the user
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: verifiedData!.email,
                password: password,
                options: {
                    data: {
                        full_name: verifiedData!.fullName,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/member/dashboard`,
                }
            });

            if (signUpError) throw signUpError;

            // 2. Link the student record (Handled by the dashboard linking logic usually, 
            // but for immediate better UX, we can try to call the manual link if needed)
            // However, after signUp, most systems require email verification.
            // If email verification is OFF, we can link immediately.

            setStep(3);
            toast.success('アカウントが有効化されました');
        } catch (error: any) {
            console.error('Activation error:', error);
            toast.error(error.message || '有効化に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="text-center pt-10 pb-6 space-y-4">
                    <div className="relative w-48 h-12 mx-auto mb-4">
                        <Image
                            src="/logo.png"
                            alt="Swim Partners"
                            fill
                            className="object-contain opacity-50 grayscale"
                        />
                    </div>

                    {/* ステップインジケーター */}
                    <div className="flex justify-center items-center space-x-3 mb-4">
                        <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-600' : 'bg-blue-100'}`} />
                        <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-600' : 'bg-blue-100'}`} />
                        <div className={`h-2 w-12 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-blue-600' : 'bg-blue-100'}`} />
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-blue-900 tracking-tight uppercase">
                            {step === 1 ? "ご本人確認" : step === 2 ? "パスワード設定" : "有効化完了"}
                        </h1>
                        <CardDescription className="text-blue-400 font-medium">
                            {step === 1 ? "登録情報の確認" : step === 2 ? "ログイン用パスワードの設定" : "設定完了"}
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent className="px-8 pb-12">
                    {step === 1 && (
                        <form onSubmit={handleVerify} className="space-y-6">
                            <p className="text-xs text-blue-400 leading-relaxed text-center font-medium bg-blue-50 p-4 rounded-2xl">
                                お申し込み時に送信いただいた<br />
                                <span className="font-bold text-blue-600">メールアドレス</span>と<span className="font-bold text-blue-600">電話番号</span>を入力してください。
                            </p>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-[10px] font-black text-blue-900/30 ml-1 uppercase tracking-widest">登録メールアドレス</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="example@mail.com"
                                            required
                                            className="bg-blue-50/30 border-none h-14 pl-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="text-[10px] font-black text-blue-900/30 ml-1 uppercase tracking-widest">登録電話番号</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="09012345678"
                                            required
                                            className="bg-blue-50/30 border-none h-14 pl-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-2xl text-lg shadow-xl shadow-blue-100 active:scale-[0.98] transition-all" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                                    <>
                                        本人確認を行う
                                        <UserCheck className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <div className="text-center">
                                <Link href="/member/login" className="text-xs font-bold text-blue-300 hover:text-blue-500 transition-colors underline underline-offset-4">
                                    ログイン画面に戻る
                                </Link>
                            </div>
                        </form>
                    )}

                    {step === 2 && verifiedData && (
                        <form onSubmit={handleActivate} className="space-y-6">
                            <div className="bg-emerald-50 p-4 rounded-2xl flex items-center space-x-3 border border-emerald-100">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />
                                <div className="text-left">
                                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">認証済み会員</p>
                                    <p className="text-sm font-bold text-emerald-900">{verifiedData.fullName} 様</p>
                                </div>
                            </div>

                            <div className="space-y-4 text-left">
                                <div className="space-y-2">
                                    <Label htmlFor="password" title="password" className="text-[10px] font-black text-blue-900/30 ml-1 uppercase tracking-widest">パスワードの設定</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="8文字以上の英数字"
                                            required
                                            minLength={8}
                                            className="bg-blue-50/30 border-none h-14 pl-12 pr-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" title="confirmPassword" className="text-[10px] font-black text-blue-900/30 ml-1 uppercase tracking-widest">パスワード（再入力）</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="確認のため再入力してください"
                                            required
                                            className="bg-blue-50/30 border-none h-14 pl-12 pr-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-blue-500 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-2xl text-lg shadow-xl shadow-blue-100 active:scale-[0.98] transition-all" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                                    <>
                                        パスワードを設定する
                                        <ShieldCheck className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-8 py-4">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-emerald-200 blur-2xl opacity-30 rounded-full animate-pulse" />
                                <div className="relative w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                                    <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                                </div>
                            </div>

                            <div className="space-y-3 px-4">
                                <h2 className="text-xl font-black text-blue-900">準備が整いました</h2>
                                <p className="text-sm text-blue-400 font-medium leading-relaxed">
                                    アカウントの有効化が正しく完了しました。<br />
                                    ご入力いただいたメールアドレスに確認メールを送信しましたので、ご確認ください。
                                </p>
                                <p className="text-[10px] text-blue-200 font-bold bg-blue-50 p-3 rounded-xl mt-4">
                                    ※メール内のリンクをクリックしなくてもログイン可能な場合がありますが、安全のため確認をお願いいたします。
                                </p>
                            </div>

                            <Button asChild className="w-full bg-blue-900 hover:bg-black text-white font-black h-16 rounded-2xl text-lg shadow-xl active:scale-[0.98] transition-all">
                                <Link href="/member/login">ログイン画面へ</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
