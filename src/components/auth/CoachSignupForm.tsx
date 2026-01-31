'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { registerCoachWithToken } from '@/app/actions/auth-signup'
import Link from 'next/link'

interface CoachSignupFormProps {
    token: string
}

export function CoachSignupForm({ token }: CoachSignupFormProps) {
    const [isPending, startTransition] = useTransition()
    const [state, setState] = useState<{ success?: boolean; error?: string }>({})
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = (formData: FormData) => {
        // Append token manually or ensure it's in a hidden field
        formData.append('token', token)

        startTransition(async () => {
            const result = await registerCoachWithToken({}, formData)
            setState(result)
        })
    }

    if (state.success) {
        return (
            <Card className="w-full max-w-md mx-auto shadow-lg">
                <CardHeader>
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                    </div>
                    <CardTitle className="text-center text-2xl">登録完了</CardTitle>
                    <CardDescription className="text-center">
                        コーチアカウントの作成が完了しました。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-center text-sm text-gray-600">
                    <p>
                        ご登録ありがとうございます。<br />
                        ログイン画面より、設定したメールアドレスとパスワードでログインしてください。
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild className="w-full">
                        <Link href="/auth/login">ログイン画面へ進む</Link>
                    </Button>
                </CardFooter>
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
                        <Input id="email" name="email" type="email" placeholder="example@swim-partners.com" required />
                    </div>
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
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        登録する
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
