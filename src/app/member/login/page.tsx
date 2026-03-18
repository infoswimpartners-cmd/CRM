'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, KeyRound, Mail, UserPlus, Eye, EyeOff } from 'lucide-react';
import { login } from './actions';
import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const initialState = {
    error: '',
};

export default function MemberLoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (state?.error) {
            toast.error(state.error);
        }
    }, [state?.error]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardHeader className="text-center pt-10 pb-6 space-y-4">
                    <div className="relative w-48 h-16 mx-auto">
                        <Image
                            src="/logo.png"
                            alt="Swim Partners"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-black text-blue-900 tracking-tight">マイページにログイン</h1>
                        <CardDescription className="text-blue-400 font-medium"></CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-8 pb-10 space-y-8">
                    <form action={formAction} className="space-y-5">
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
                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <Label htmlFor="password" className="text-xs font-bold text-blue-900/40 uppercase tracking-widest">パスワード</Label>
                                <Link href="/member/forgot-password" hidden className="text-[10px] font-bold text-blue-400 hover:text-blue-600 transition-colors uppercase tracking-tighter">忘れた場合</Link>
                            </div>
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-300" />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    required
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

                        <div className="flex items-center space-x-2 ml-1">
                            <Checkbox
                                id="remember"
                                name="remember"
                                value="true"
                                className="border-blue-100 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <Label
                                htmlFor="remember"
                                className="text-sm font-medium text-blue-900/60 cursor-pointer"
                            >
                                ログイン状態を維持する
                            </Label>
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl text-lg shadow-lg shadow-blue-200 active:scale-[0.98] transition-all mt-2" disabled={isPending}>
                            {isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "ログインする"}
                        </Button>
                    </form>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-blue-50" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em] text-blue-100">
                            <span className="bg-white px-4">または</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Button asChild variant="outline" className="w-full h-14 border-blue-100 border-2 rounded-2xl text-blue-600 font-bold hover:bg-blue-50 hover:text-blue-700 transition-all group">
                            <Link href="/member/activate">
                                <UserPlus className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                                初めての方はこちら（有効化）
                            </Link>
                        </Button>
                        <p className="text-[10px] text-center text-blue-300 font-medium px-4">
                            ※スクールに登録済みのメールアドレスと電話番号でアカウントを有効化できます。
                        </p>
                    </div>

                    <div className="text-center pt-2">
                        <Link href="/member/forgot-password" data-id="forgot-password-link" className="text-xs font-bold text-blue-300 hover:text-blue-500 transition-colors">
                            パスワードをお忘れの方はこちら
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
