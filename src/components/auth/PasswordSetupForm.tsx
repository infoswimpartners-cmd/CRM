'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeRegistration } from '@/app/actions/auth-invite'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface PasswordSetupFormProps {
    token: string
    email: string
    name: string
}

export function PasswordSetupForm({ token, email, name }: PasswordSetupFormProps) {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        // Basic Validation
        if (password.length < 8) {
            setError('パスワードは8文字以上で設定してください。')
            return
        }
        if (password !== confirmPassword) {
            setError('パスワードが一致しません。')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await completeRegistration(token, password)
            if (result.success) {
                setSuccess(true)
                setTimeout(() => {
                    router.push('/login')
                }, 3000)
            } else {
                setError(result.error || 'エラーが発生しました。')
            }
        } catch (err) {
            setError('予期せぬエラーが発生しました。')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (success) {
        return (
            <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">登録完了</h2>
                <p className="text-slate-600 mb-6">パスワードの設定が完了しました。<br />ログイン画面へ移動します。</p>
                <Button onClick={() => router.push('/login')} className="w-full">
                    ログイン画面へ
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
                <p className="text-sm text-slate-500 mb-1">ようこそ</p>
                <h2 className="text-lg font-bold text-slate-800">{name} 様</h2>
                <p className="text-xs text-slate-400 mt-1">{email}</p>
            </div>

            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">新しいパスワード</Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="8文字以上の英数字"
                            className="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 text-slate-400"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">パスワード（確認）</Label>
                    <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="もう一度入力してください"
                    />
                </div>
            </div>

            {error && (
                <div className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                    {error}
                </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        設定中...
                    </>
                ) : (
                    '登録を完了する'
                )}
            </Button>
        </form>
    )
}
