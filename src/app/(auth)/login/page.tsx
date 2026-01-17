'use client'

import { useActionState, useState } from 'react'
import { login } from './actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, Eye, EyeOff, Waves } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Image from 'next/image'

const initialState = {
    error: '',
}

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(login, initialState)
    const [showPassword, setShowPassword] = useState(false)

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-slate-50 font-sans">
            {/* Background Orbs */}
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />

            {/* Login Card */}
            <div className="glass-card w-full max-w-md p-8 relative z-10 animate-fade-in-up border-white/60 shadow-xl">

                <div className="text-center mb-8 space-y-2">
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative w-64 h-16">
                            <Image
                                src="/logo.png"
                                alt="Swim Partners"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                </div>

                <form action={formAction} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-600 text-xs uppercase tracking-wider font-semibold ml-1">メールアドレス</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="coach@example.com"
                                required
                                className="bg-white/50 border-white/40 text-slate-800 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-600 text-xs uppercase tracking-wider font-semibold ml-1">パスワード</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="bg-white/50 border-white/40 text-slate-800 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/20 h-12 rounded-xl pr-10 transition-all"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1 h-10 w-10 text-slate-400 hover:text-primary hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">{showPassword ? 'パスワードを隠す' : 'パスワードを表示'}</span>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {state?.error && (
                        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-600">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <AlertTitle>エラー</AlertTitle>
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white font-bold tracking-wide rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
                        disabled={isPending}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                認証中...
                            </>
                        ) : (
                            'ログイン'
                        )}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <Link href="/forgot-password" className="text-sm text-slate-500 hover:text-primary transition-colors">
                        パスワードをお忘れですか？
                    </Link>
                </div>
            </div >
        </div >
    )
}

