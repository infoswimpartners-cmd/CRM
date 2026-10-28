'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, Sparkles, Mail } from 'lucide-react'
import { registerCoachWithToken } from '@/app/actions/auth-signup'
import { detectDomainTypo, sanitizeEmail } from '@/lib/utils/emailValidation'
import Link from 'next/link'

interface CoachSignupFormProps {
    token: string
}

export function CoachSignupForm({ token }: CoachSignupFormProps) {
    const [isPending, startTransition] = useTransition()
    const [state, setState] = useState<{ success?: boolean; error?: string; autoLoginFailed?: boolean; registeredEmail?: string }>({})
    const [email, setEmail] = useState('')
    const [confirmEmail, setConfirmEmail] = useState('')
    const [emailError, setEmailError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // ドメインタイポ検知
    const typoInfo = email ? detectDomainTypo(email) : { hasTypo: false }

    const handleApplySuggestion = () => {
        if (typoInfo.suggestedEmail) {
            setEmail(typoInfo.suggestedEmail)
            setConfirmEmail(typoInfo.suggestedEmail)
            setEmailError(null)
        }
    }

    useEffect(() => {
        if (state.success && !state.autoLoginFailed) {
            const timer = setTimeout(() => {
                window.location.href = '/coach'
            }, 1800)
            return () => clearTimeout(timer)
        }
    }, [state.success, state.autoLoginFailed])

    const handleSubmit = (formData: FormData) => {
        setEmailError(null)

        const sanitized = sanitizeEmail(email)
        const sanitizedConfirm = sanitizeEmail(confirmEmail)

        if (!sanitized) {
            setEmailError('メールアドレスを入力してください。')
            return
        }

        if (sanitized !== sanitizedConfirm) {
            setEmailError('メールアドレスが一致しません。誤字がないかご確認ください。')
            return
        }

        // サニタイズ済みメールをセット
        formData.set('email', sanitized)
        formData.set('confirmEmail', sanitizedConfirm)
        formData.append('token', token)

        startTransition(async () => {
            const result = await registerCoachWithToken({}, formData)
            setState(result)
        })
    }

    if (state.success) {
        return (
            <Card className="w-full max-w-md mx-auto shadow-lg border-slate-100/80">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="h-12 w-12 text-emerald-500" />
                    </div>
                    <CardTitle className="text-center text-2xl text-slate-800">登録完了</CardTitle>
                    <CardDescription className="text-center text-slate-500">
                        コーチアカウントの作成が完了しました。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-sm text-slate-600 pb-6">
                    {/* 登録されたメールアドレスの明示 */}
                    {state.registeredEmail && (
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-left space-y-1">
                            <span className="text-[11px] font-bold text-blue-900 block flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 text-blue-600" />
                                登録されたログインメールアドレス:
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 break-all block">
                                {state.registeredEmail}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                                ※次回以降のログイン時にこのメールアドレスを使用します。
                            </span>
                        </div>
                    )}

                    {!state.autoLoginFailed ? (
                        <div className="space-y-3">
                            <p className="font-medium text-slate-700">ご登録ありがとうございます！</p>
                            <p className="text-xs text-slate-400">
                                管理システムへ自動ログインしています...<br />
                                そのままお待ちください。
                            </p>
                            <div className="flex justify-center pt-2">
                                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="mb-4">
                                ご登録ありがとうございました。<br />
                                自動ログインに失敗したため、お手数ですが下記のボタンからログインしてください。
                            </p>
                            <Button asChild className="w-full bg-cyan-600 hover:bg-cyan-700">
                                <Link href="/login">ログイン画面へ進む</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="text-center text-2xl">コーチアカウント登録</CardTitle>
                <CardDescription className="text-center">
                    以下の情報を入力して登録を完了してください。
                </CardDescription>
            </CardHeader>
            <form action={handleSubmit}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">氏名</Label>
                        <Input id="fullName" name="fullName" placeholder="例: 山田 太郎" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">メールアドレス</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setEmailError(null)
                            }}
                            placeholder="example@swim-partners.com"
                            required
                            autoCapitalize="none"
                            autoComplete="email"
                            className="font-mono"
                        />
                    </div>

                    {/* ドメインタイポ検知サジェスト */}
                    {typoInfo.hasTypo && typoInfo.suggestedEmail && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>もしかして: <strong>{typoInfo.suggestedEmail}</strong> ですか？</span>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleApplySuggestion}
                                className="h-7 text-xs px-2 bg-white border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0"
                            >
                                反映する
                            </Button>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="confirmEmail">メールアドレス（確認用再入力）</Label>
                        <Input
                            id="confirmEmail"
                            name="confirmEmail"
                            type="email"
                            value={confirmEmail}
                            onChange={(e) => {
                                setConfirmEmail(e.target.value)
                                setEmailError(null)
                            }}
                            placeholder="もう一度入力してください"
                            required
                            autoCapitalize="none"
                            autoComplete="off"
                            className="font-mono"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            ※誤登録を防ぐため、確認用の再入力をお願いいたします
                        </p>
                    </div>

                    {emailError && (
                        <div className="bg-red-50 text-red-600 p-2.5 rounded-md text-xs flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{emailError}</span>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="password">パスワード</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                minLength={8}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="sr-only">
                                    {showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                                </span>
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">8文字以上で設定してください</p>
                    </div>


                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                minLength={8}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="sr-only">
                                    {showConfirmPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                                </span>
                            </Button>
                        </div>
                    </div>

                    {state.error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {state.error}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="mt-4">
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        登録する
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
