'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, ArrowLeft, Send } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/member/update-password`,
            });

            if (error) throw error;

            setSuccess(true);
            toast.success('パスワード再設定メールを送信しました');
        } catch (error: any) {
            console.error('Reset password error:', error);
            if (error.message?.includes('rate limit exceeded')) {
                toast.error('送信制限を超えました。数分待ってから再度お試しください。');
            } else {
                toast.error(error.message || '送信に失敗しました');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md text-center p-8">
                    <CardHeader className="space-y-6 pt-6">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto border-4 border-white shadow-lg">
                            <Send className="h-10 w-10 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-black text-blue-900 tracking-tight">送信完了</h1>
                            <CardDescription className="text-blue-400 font-medium leading-relaxed">
                                パスワード再設定用のリンクを送信いたしました。<br />
                                メール内の指示に従って再設定を行ってください。
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pb-10">
                        <Button asChild className="w-full bg-blue-900 hover:bg-black text-white font-black h-16 rounded-2xl text-lg shadow-xl active:scale-[0.98] transition-all">
                            <Link href="/member/login">ログイン画面に戻る</Link>
                        </Button>
                        <p className="text-[10px] text-blue-200 font-bold bg-blue-50 p-3 rounded-xl">
                            ※メールが届かない場合は、迷惑メールフォルダをご確認いただくか、入力したメールアドレスにお間違いがないかお確かめください。
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="text-center pt-10 pb-6 space-y-4">
                    <div className="relative w-48 h-12 mx-auto mb-2 opacity-50 grayscale">
                        <Image src="/logo.png" alt="Swim Partners" fill className="object-contain" />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-blue-900 tracking-tight lowercase">パスワードの再設定</h1>
                        <CardDescription className="text-blue-400 font-medium">パスワードをお忘れの方</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-8">
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-blue-900/40 ml-1 uppercase tracking-widest">メールアドレス</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="example@mail.com"
                                    required
                                    className="bg-blue-50/50 border-none h-14 pl-12 rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-400 transition-all font-medium placeholder:text-blue-100"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-all mt-4" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "再設定リンクを送信"}
                        </Button>

                        <div className="text-center">
                            <Button asChild variant="link" className="text-xs text-blue-300 font-bold hover:text-blue-500 transition-colors">
                                <Link href="/member/login">
                                    <ArrowLeft className="mr-2 h-4 w-4" /> ログイン画面に戻る
                                </Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
