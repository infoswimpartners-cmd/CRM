'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client'; // Email login still uses Supabase

export default function MemberLoginPage() {
    const [loading, setLoading] = useState(false);

    const handleLineLogin = async () => {
        try {
            setLoading(true);
            // NextAuth.jsを使用してLINEでログイン
            await signIn('line', { callbackUrl: '/member/dashboard' });
        } catch (error) {
            console.error('Login error:', error);
            toast.error('ログインに失敗しました');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2 flex flex-col items-center">
                    <div className="relative w-48 h-16 mb-2">
                        <Image
                            src="/logo.png"
                            alt="Swim Partners"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    {/* <CardTitle className="text-2xl font-bold text-blue-900">Swim Partners</CardTitle> */}
                    <CardDescription>会員専用マイページ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center text-sm text-gray-500">
                        <p>レッスンの予約・確認、カルテの閲覧は</p>
                        <p>こちらからログインしてください。</p>
                    </div>

                    <Button
                        className="w-full bg-[#06C755] hover:bg-[#05b34c] text-white font-bold h-12 text-lg"
                        onClick={handleLineLogin}
                        disabled={loading}
                    >
                        <MessageCircle className="mr-2 h-6 w-6" />
                        LINEでログイン
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground">
                                または メールアドレスでログイン
                            </span>
                        </div>
                    </div>

                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setLoading(true);
                        const formData = new FormData(e.currentTarget);
                        const email = formData.get('email') as string;
                        const password = formData.get('password') as string;

                        try {
                            const supabase = createClient();
                            const { error } = await supabase.auth.signInWithPassword({
                                email,
                                password,
                            });

                            if (error) throw error;

                            // Successful login will redirect via middleware or we can force push
                            // But usually middleware handles session. Let's redirect to check linking.
                            // However, we need to trigger the linking logic.
                            // The easiest way is to hit the callback route manually or rely on a subsequent check.

                            // For simplicity and robustness, let's just refresh/push to dashboard
                            // The dashboard or middleware should handle the case of "not linked yet"?
                            // Our callback route handles linking for OAuth.
                            // For Email login, we need to invoke linking too.

                            // Let's call the server action for linking explicitly here?
                            // No, can't call server action from client easily mixed with supabase client auth unless we use server action for auth.
                            // Let's just push to dashboard, and ideally dashboard checks for linking and redirects if needed?
                            // Currently dashboard just shows placeholder if no student data found or errors.

                            // Actually, let's call the server action `linkStudentData` which IS a server action!
                            // We can import it.
                            const { linkStudentData } = await import('@/actions/member/auth');
                            const linkResult = await linkStudentData();

                            if (linkResult.success) {
                                window.location.href = '/member/dashboard';
                            } else {
                                window.location.href = `/member/link-error?message=${encodeURIComponent(linkResult.message)}`;
                            }

                        } catch (error: any) {
                            console.error('Login error:', error);
                            toast.error(error.message || 'ログインに失敗しました');
                            setLoading(false);
                        }
                    }} className="space-y-4">
                        <div className="space-y-2">
                            <Input name="email" type="email" placeholder="メールアドレス" required className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Input name="password" type="password" placeholder="パスワード" required className="bg-white" />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            ログイン
                        </Button>
                    </form>

                    <div className="text-center space-y-2 text-sm">
                        <div>
                            <Link href="/member/signup" className="text-blue-600 hover:underline">
                                初めての方はこちら（新規登録）
                            </Link>
                        </div>
                        <div>
                            <Link href="/member/forgot-password" className="text-gray-500 hover:underline">
                                パスワードをお忘れの方
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
