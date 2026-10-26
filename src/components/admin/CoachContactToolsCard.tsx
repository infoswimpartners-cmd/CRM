'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Smartphone, Copy, Check, ExternalLink, Mail, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CoachContactToolsCardProps {
    googleChatEmail?: string | null
    loginEmail: string
    lineAdminInviteUrl?: string | null
    coachName: string
}

export function CoachContactToolsCard({
    googleChatEmail,
    loginEmail,
    lineAdminInviteUrl,
    coachName
}: CoachContactToolsCardProps) {
    const [copiedChat, setCopiedChat] = useState(false)
    const [copiedLine, setCopiedLine] = useState(false)

    const handleCopyChatEmail = async () => {
        const target = googleChatEmail || loginEmail
        try {
            await navigator.clipboard.writeText(target)
            setCopiedChat(true)
            toast.success(`Googleチャット用Gmail（${target}）をコピーしました`)
            setTimeout(() => setCopiedChat(false), 2000)
        } catch {
            toast.error('クリップボードへのコピーに失敗しました')
        }
    }

    const handleCopyLineUrl = async () => {
        if (!lineAdminInviteUrl) return
        try {
            await navigator.clipboard.writeText(lineAdminInviteUrl)
            setCopiedLine(true)
            toast.success('公式LINE管理者招待URLをコピーしました')
            setTimeout(() => setCopiedLine(false), 2000)
        } catch {
            toast.error('クリップボードへのコピーに失敗しました')
        }
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
                        <MessageSquare className="h-5 w-5 text-blue-600 shrink-0" />
                        <span>業務連絡ツール連携状況（Google Chat ＆ LINE）</span>
                    </CardTitle>
                    {googleChatEmail ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Gmail登録済
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Gmail未確認
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-xs text-slate-500">
                    本部連絡用のGoogleチャット招待用アカウントおよび生徒連絡用公式LINEの管理情報です。
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Googleチャット情報 */}
                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                                <Mail className="h-4 w-4 text-blue-600" />
                                Googleチャット用Gmail
                            </span>
                            {googleChatEmail ? (
                                <Badge className="bg-blue-600 text-white text-[10px]">
                                    スペース招待用
                                </Badge>
                            ) : (
                                <span className="text-[11px] text-amber-600 font-medium">
                                    未登録
                                </span>
                            )}
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-blue-200/60 space-y-2">
                            <div className="text-xs font-mono font-semibold text-slate-800 break-all">
                                {googleChatEmail || (
                                    <span className="text-slate-400 italic">
                                        （未設定 - ログインメール: {loginEmail}）
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleCopyChatEmail}
                                    className="h-8 text-xs bg-white border-blue-300 hover:bg-blue-50 text-blue-700 gap-1.5 shadow-xs"
                                >
                                    {copiedChat ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            コピー完了
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            Gmailをコピー
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className="h-8 text-xs text-slate-600 gap-1"
                                >
                                    <a href="https://mail.google.com/chat/u/0/" target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                        Google Chatを開く
                                    </a>
                                </Button>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            💡 Google Chatの該当スペースにて「メンバーを追加」を開き、上記のGmailを貼り付けて招待してください。
                        </p>
                    </div>

                    {/* 公式LINE情報 */}
                    <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                                <Smartphone className="h-4 w-4 text-emerald-600" />
                                公式LINE 管理者招待
                            </span>
                            {lineAdminInviteUrl ? (
                                <Badge className="bg-emerald-600 text-white text-[10px]">
                                    招待URL設定済
                                </Badge>
                            ) : (
                                <span className="text-[11px] text-slate-400 font-medium">
                                    未設定
                                </span>
                            )}
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-emerald-200/60 space-y-2">
                            <div className="text-xs font-mono text-slate-700 break-all truncate">
                                {lineAdminInviteUrl || (
                                    <span className="text-slate-400 italic">
                                        URL未設定（コーチ編集から追加可能）
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {lineAdminInviteUrl && (
                                    <>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCopyLineUrl}
                                            className="h-8 text-xs bg-white border-emerald-300 hover:bg-emerald-50 text-emerald-800 gap-1.5 shadow-xs"
                                        >
                                            {copiedLine ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    コピー完了
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" />
                                                    URLをコピー
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            asChild
                                            className="h-8 text-xs text-slate-600 gap-1"
                                        >
                                            <a href={lineAdminInviteUrl} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                                招待を開く
                                            </a>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            💡 コーチ専用の公式アカウントの管理者招待URLです。コーチのオンボーディング画面で案内されます。
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
