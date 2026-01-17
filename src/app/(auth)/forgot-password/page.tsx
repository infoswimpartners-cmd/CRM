'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/app/actions/auth'
import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ForgotPasswordPage() {
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        setError(null)

        const result = await resetPassword(formData)

        setLoading(false)

        if (result?.error) {
            setError(result.error)
        } else {
            setSuccess(true)
        }
    }

    if (success) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold">メールを送信しました</CardTitle>
                        <CardDescription>
                            入力されたメールアドレスにパスワード再設定用のリンクを送信しました。<br />
                            メールを確認して手続きを進めてください。
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="justify-center">
                        <Button asChild variant="outline">
                            <Link href="/login">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                ログイン画面に戻る
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">パスワードの再設定</CardTitle>
                    <CardDescription className="text-center">
                        登録済みのメールアドレスを入力してください。<br />
                        再設定用のリンクを送信します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">メールアドレス</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="coach@example.com"
                                required
                            />
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? '送信中...' : '再設定メールを送信'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center">
                    <Link href="/login" className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        ログイン画面に戻る
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
