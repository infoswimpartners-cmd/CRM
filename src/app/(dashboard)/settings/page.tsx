import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export default async function SettingsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return <div>Profile not found</div>
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">設定</h1>
                <p className="text-gray-500">アカウント情報の確認と設定</p>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle>プロフィール基本情報</CardTitle>
                            <CardDescription>
                                現在登録されているアカウント情報です。
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/coach/profile">編集</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label>氏名</Label>
                            <Input value={profile.full_name || ''} disabled readOnly className="bg-gray-100" />
                        </div>
                        <div className="grid gap-2">
                            <Label>メールアドレス</Label>
                            <Input value={profile.email || ''} disabled readOnly className="bg-gray-100" />
                        </div>
                        <div className="grid gap-2">
                            <Label>権限 (ロール)</Label>
                            <Input value={profile.role === 'admin' ? '管理者' : 'コーチ'} disabled readOnly className="bg-gray-100" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>セキュリティ設定</CardTitle>
                        <CardDescription>
                            パスワードの変更はこちらから行えます。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 rounded-full">
                                    <Lock className="h-6 w-6 text-gray-500" />
                                </div>
                                <div>
                                    <div className="font-medium">ログインパスワード</div>
                                    <div className="text-sm text-gray-500">定期的な変更を推奨します</div>
                                </div>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href="/update-password">
                                    変更する
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
