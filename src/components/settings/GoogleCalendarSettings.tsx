'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { disconnectGoogleCalendar } from '@/actions/google-auth'
import { toast } from 'sonner'

interface GoogleCalendarSettingsProps {
    initialIsLinked: boolean
    redirectPath: string
}

export function GoogleCalendarSettings({ initialIsLinked, redirectPath }: GoogleCalendarSettingsProps) {
    const [isLinked, setIsLinked] = useState(initialIsLinked)
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    const handleDisconnect = async () => {
        if (!confirm('Googleカレンダーの連携を解除しますか？自動同期が停止します。')) return

        setIsDisconnecting(true)
        try {
            const result = await disconnectGoogleCalendar()
            if (result.success) {
                setIsLinked(false)
                toast.success('Googleカレンダーの連携を解除しました')
            } else {
                toast.error('解除に失敗しました: ' + result.error)
            }
        } catch (err) {
            toast.error('エラーが発生しました')
        } finally {
            setIsDisconnecting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Googleカレンダー連携
                </CardTitle>
                <CardDescription>
                    レッスンスケジュールの自動同期設定を管理します。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 border rounded-xl bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isLinked ? 'bg-green-100' : 'bg-amber-100'}`}>
                            {isLinked ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            ) : (
                                <AlertCircle className="h-6 w-6 text-amber-600" />
                            )}
                        </div>
                        <div>
                            <div className="font-bold text-slate-700">
                                ステータス: {isLinked ? '連携済み' : '未連携'}
                            </div>
                            <div className="text-sm text-slate-500">
                                {isLinked 
                                    ? 'あなたのGoogleカレンダーと同期されています。' 
                                    : '自動同期を有効にするには連携が必要です。'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {isLinked ? (
                            <>
                                <Button variant="outline" size="sm" asChild className="bg-white gap-1">
                                    <a href={`/api/google/auth?state=${encodeURIComponent(redirectPath)}`}>
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        アカウントを変更
                                    </a>
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleDisconnect}
                                    disabled={isDisconnecting}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    解除
                                </Button>
                            </>
                        ) : (
                            <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                                <a href={`/api/google/auth?state=${encodeURIComponent(redirectPath)}`}>
                                    <Calendar className="h-3.5 w-3.5" />
                                    連携を開始する
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
