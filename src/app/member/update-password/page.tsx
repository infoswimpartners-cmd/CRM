'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

export default function UpdatePasswordPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [checking, setChecking] = useState(true);
    const router = useRouter();

    // 認証セッションの初期化と確認
    useEffect(() => {
        const initSession = async () => {
            try {
                const supabase = createClient();
                const params = new URLSearchParams(window.location.search);
                const code = params.get('code');

                // 1. まず現在のセッションを確認
                const { data: { session } } = await supabase.auth.getSession();

                // 2. セッションがなく、URLにコードがある場合は交換を試みる
                if (!session && code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    // 交換成功後はURLからコードを削除
                    window.history.replaceState({}, '', window.location.pathname);
                } else if (!session && !code) {
                    // セッションもコードもない場合は明確にエラーを投げる
                    throw new Error('NoSession');
                }
            } catch (error: any) {
                console.error('Session init error:', error);
                if (error.message === 'NoSession') {
                    toast.error('有効な認証セッションが見つかりません。パスワード再設定メールのリンクから再度アクセスしてください。');
                } else {
                    toast.error('認証に失敗しました。リンクが無効または期限切れの可能性があります。');
                }
            } finally {
                setChecking(false);
            }
        };
        initSession();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        // React イベントループの都合上、await をまたぐと e.currentTarget の参照が失われるため
        // 非同期処理の前に FormData を同期的に取得します
        const formData = new FormData(e.currentTarget);
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        const supabase = createClient();

        try {
            // 送信前に再度セッションを確認（AuthSessionMissingError 防止）
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('セッションが有効ではありません。再度メールのリンクからアクセスしてください。');
            }

            if (password !== confirmPassword) {
                toast.error('パスワードが一致しません');
                setLoading(false);
                return;
            }

            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            setSuccess(true);
            toast.success('パスワードを更新しました');
            setTimeout(() => {
                router.push('/member/login');
            }, 3000);
        } catch (error: any) {
            console.error('Update password error:', error);
            if (error.message?.includes('different from the old password')) {
                toast.error('新しいパスワードは、現在のパスワードと異なるものを設定してください。');
            } else {
                toast.error(error.message || '更新に失敗しました');
            }
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="text-center pt-10 pb-6 space-y-4">
                    <div className="relative w-48 h-12 mx-auto mb-2 opacity-50 grayscale">
                        <Image src="/logo.png" alt="Swim Partners" fill className="object-contain" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-blue-900 tracking-tight lowercase">パスワードの更新</h1>
                        <CardDescription className="text-blue-400 font-medium">新しいパスワードを設定してください</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-8">
                    {checking ? (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                            <p className="text-sm font-bold text-blue-900/40 tracking-widest">認証を確認中...</p>
                        </div>
                    ) : success ? (
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            </div>
                            <p className="text-sm font-bold text-emerald-900">
                                パスワードの設定が完了しました。<br />
                                自動的にログイン画面へ戻ります。
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">新しいパスワード</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="8文字以上の英数字"
                                            required
                                            minLength={8}
                                            className="bg-blue-50/50 border-none h-14 pl-12 pr-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
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
                                    <Label htmlFor="confirmPassword" title="confirmPassword" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">パスワード（再入力）</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="確認のためもう一度入力"
                                            required
                                            className="bg-blue-50/50 border-none h-14 pl-12 pr-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
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

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-all mt-4" disabled={loading}>
                                {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (
                                    <>
                                        パスワードを更新
                                        <ShieldCheck className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
