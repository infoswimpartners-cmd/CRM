'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    CreditCard,
    Menu,
    CheckCircle2,
    Copy,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Users,
    Unlink,
    Info,
    Sparkles
} from 'lucide-react'
import {
    getRichMenuSettingsAction,
    saveRichMenuSettingsAction,
    syncAllActiveMembersRichMenu,
} from '@/actions/line-richmenu'
import { unlinkAllUserRichMenusAction } from '@/actions/line-marketing'

export function RichMenuSettingsTab() {
    const [memberRichMenuId, setMemberRichMenuId] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isUnlinking, setIsUnlinking] = useState(false)

    const portalUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/member/billing/stripe-portal`
        : 'https://manager.swim-partners.com/member/billing/stripe-portal'

    const mypageBillingUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/member/billing`
        : 'https://manager.swim-partners.com/member/billing'

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        setIsLoading(true)
        try {
            const settings = await getRichMenuSettingsAction()
            if (settings.memberRichMenuId) {
                setMemberRichMenuId(settings.memberRichMenuId)
            }
        } catch (e: any) {
            console.error('Failed to load rich menu settings:', e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await saveRichMenuSettingsAction({
                memberRichMenuId: memberRichMenuId.trim(),
            })
            if (res.success) {
                toast.success('リッチメニュー設定を保存しました。')
            } else {
                toast.error('保存に失敗しました: ' + (res.error || '不明なエラー'))
            }
        } catch (e: any) {
            toast.error('保存処理中にエラーが発生しました。')
        } finally {
            setIsSaving(false)
        }
    }

    const handleSyncAllMembers = async () => {
        if (!memberRichMenuId.trim()) {
            toast.error('先に会員用リッチメニューIDを入力して保存してください。')
            return
        }

        setIsSyncing(true)
        try {
            const res = await syncAllActiveMembersRichMenu()
            if (res.success) {
                toast.success(
                    `一括反映が完了しました（有効会員 ${res.totalActiveWithLine} 名中 ${res.linkedCount} 件に適用）`
                )
            } else {
                toast.error('一括反映に失敗しました: ' + (res.error || '不明なエラー'))
            }
        } catch (e: any) {
            toast.error('一括反映処理中にエラーが発生しました。')
        } finally {
            setIsSyncing(false)
        }
    }

    const handleUnlinkAll = async () => {
        if (!confirm('全ユーザーの個別リッチメニュー設定を解除し、初期（デフォルト）リッチメニューに戻しますか？')) {
            return
        }

        setIsUnlinking(true)
        try {
            const res = await unlinkAllUserRichMenusAction()
            if (res.success) {
                toast.success(`全ユーザーの個別リッチメニューを解除しました（${res.unlinkedCount}件解除）`)
            } else {
                toast.error('解除に失敗しました: ' + (res.error || '不明なエラー'))
            }
        } catch (e: any) {
            toast.error('解除処理中にエラーが発生しました。')
        } finally {
            setIsUnlinking(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label}をクリップボードにコピーしました`)
    }

    return (
        <div className="space-y-6">
            {/* 1. リッチメニューID設定 & 自動切り替え */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Menu className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">
                                会員用リッチメニュー自動切り替え設定
                            </CardTitle>
                            <CardDescription>
                                顧客が入会（ステータスが「受講中・有効会員」）した際に、LINE公式アカウントのリッチメニューを自動で会員専用メニューへ切り替えます。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 text-xs text-blue-900 leading-relaxed space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-sm text-blue-950">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            <span>自動切り替えの仕組み</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                            <li><strong>入会時（自動）</strong>: 会員登録や初回決済が完了すると、対象のLINEユーザーに自動で「会員用リッチメニュー」が適用されます。</li>
                            <li><strong>退会時（自動）</strong>: 退会処理（ステータス: withdrawn）が行われると、個別の会員リッチメニューが解除され、初回の見込み客用リッチメニュー（デフォルト）へ自動で戻ります。</li>
                            <li><strong>既存会員への一括適用</strong>: 下記の「既存会員全員に一括適用」ボタンを押すと、現在受講中の会員全員に即座に会員用リッチメニューが適用されます。</li>
                        </ul>
                    </div>

                    <div className="space-y-2 max-w-xl">
                        <Label htmlFor="memberRichMenuId" className="text-sm font-bold text-slate-700">
                            会員用リッチメニューID <span className="text-rose-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="memberRichMenuId"
                                placeholder="richmenu-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={memberRichMenuId}
                                onChange={(e) => setMemberRichMenuId(e.target.value)}
                                disabled={isLoading || isSaving}
                                className="font-mono text-sm"
                            />
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || isLoading}
                                className="bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                            >
                                {isSaving ? '保存中...' : '設定を保存'}
                            </Button>
                        </div>
                        <p className="text-[11px] text-slate-500">
                            ※ LINE Official Account Manager（LINE公式管理画面）の「リッチメニュー」で作成した会員用メニューのIDを入力してください。
                        </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                        <Button
                            onClick={handleSyncAllMembers}
                            disabled={isSyncing || !memberRichMenuId.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 gap-2 shadow-xs"
                        >
                            <Users className="h-4 w-4" />
                            {isSyncing ? '一括適用中...' : '既存会員全員に会員用リッチメニューを一括適用'}
                        </Button>

                        <Button
                            onClick={handleUnlinkAll}
                            disabled={isUnlinking}
                            variant="outline"
                            className="text-slate-600 hover:text-rose-600 hover:border-rose-300 text-xs h-10 gap-2"
                        >
                            <Unlink className="h-4 w-4" />
                            {isUnlinking ? '解除中...' : '全ユーザーのリッチメニュー個別設定を解除（デフォルトに戻す）'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 2. リッチメニューに設定するリンク（支払い・カード変更URL） */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">
                                リッチメニュー設定用 Stripe支払い変更リンク
                            </CardTitle>
                            <CardDescription>
                                会員用リッチメニューの「お支払い・カード変更」ボタンのアクションURLとしてご設定ください。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-4">
                        {/* URL 1: LIFFダイレクト遷移URL */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    推奨: LINE内ダイレクト遷移URL（リッチメニューのボタンURLに指定）
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(portalUrl, 'ダイレクト遷移URL')}
                                    className="h-7 text-xs gap-1 text-slate-600 hover:text-slate-900"
                                >
                                    <Copy className="h-3.5 w-3.5" /> コピー
                                </Button>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 break-all select-all">
                                {portalUrl}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                LINEアプリ内でタップすると、LINEユーザーIDを自動判定して<strong>パスワード入力不要で直接Stripeのカード変更画面</strong>を開きます。
                            </p>
                        </div>

                        {/* URL 2: 会員マイページURL */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    通常案内用: 会員マイページ（ご契約・お支払い画面）URL
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(mypageBillingUrl, 'マイページURL')}
                                    className="h-7 text-xs gap-1 text-slate-600 hover:text-slate-900"
                                >
                                    <Copy className="h-3.5 w-3.5" /> コピー
                                </Button>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-xs text-slate-700 break-all select-all">
                                {mypageBillingUrl}
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                通常ブラウザ（PCやSafari）からカード変更を行う場合や、メール・チャットで生徒に直接ご案内する際に使用できます。
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
