'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function MemberSignupPage() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;

        if (password !== confirmPassword) {
            toast.error('パスワードが一致しません');
            setLoading(false);
            return;
        }

        try {
            const supabase = createClient();
            const { error, data } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback?next=/member/dashboard`,
                },
            });

            if (error) throw error;

            if (data.user) {
                setSuccess(true);
                toast.success('確認メールを送信しました');
            }
        } catch (error: any) {
            console.error('Signup error:', error);
            toast.error(error.message || '登録に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>メールを確認してください</CardTitle>
                        <CardDescription>
                            ご入力いただいたメールアドレスに確認メールを送信しました。<br />
                            メール内のリンクをクリックして登録を完了してください。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                            <Link href="/member/login">ログイン画面に戻る</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[80vh] items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">新規会員登録</CardTitle>
                    <CardDescription className="text-center">
                        メールアドレスとパスワードを入力してください
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="example@swim-partners.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="8文字以上"
                                minLength={8}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                placeholder="もう一度入力してください"
                                minLength={8}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            登録する
                        </Button>

                        <div className="text-center text-sm pt-4">
                            <Link href="/member/login" className="text-blue-600 hover:underline">
                                すでにアカウントをお持ちの方はこちら (ログイン)
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
