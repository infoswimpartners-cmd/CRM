'use client'

import React, { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
    BookOpen,
    Copy,
    Check,
    MessageCircle,
    Mail,
    Sparkles,
    AlertCircle,
    ExternalLink,
    CheckCircle2
} from 'lucide-react'

interface CoachOnboardingGuideDialogProps {
    defaultCoachName?: string
}

export function CoachOnboardingGuideDialog({ defaultCoachName = '' }: CoachOnboardingGuideDialogProps) {
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    // テンプレートカスタマイズ用ステート
    const [coachName, setCoachName] = useState(defaultCoachName)
    const [lineInviteUrl, setLineInviteUrl] = useState('')

    const generateTemplate = () => {
        const targetName = coachName.trim() ? `${coachName.trim()} コーチ` : '〇〇 コーチ'
        const targetLineUrl = lineInviteUrl.trim() ? lineInviteUrl.trim() : 'https://line.me/R/ti/p/xxxxxx（※発行したURLを貼り付け）'

        return `【重要】Swim Partners 業務委託契約締結および初期設定（オンボーディング）のお願い

${targetName}

お世話になっております。Swim Partners 事務局でございます。
先日はお忙しい中、面談のお時間をいただき誠にありがとうございました。

選考の結果、ぜひ ${targetName} に Swim Partners のパートナーコーチとしてご参画いただきたく存じます。
つきましては、レッスン稼働に向けた「業務委託契約の締結」および「初期設定」のお手続きをお願いいたします。

本システム（SPポータル）上で、画面の案内に沿って約5〜10分程度でお手続きが完了いたします。
以下の手順に沿ってご対応をお願い申し上げます。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
■ 初期設定・契約手続きの流れ（全5ステップ）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【お手続き用URL（SPポータル）】
https://sp-manager.com/coach/onboarding
（※ログイン後、自動的に設定画面が表示されます）

▼ STEP 1: 契約書・覚書の確認と電子同意
・「業務委託基本契約書」および「報酬に関する覚書」をご確認の上、ご署名（氏名・現住所のご入力）と同意をお願いいたします。

▼ STEP 2: コーチプロフィールの登録
・指導可能種目、自己紹介、および「活動可能エリア（都道府県・市区町村・最寄路線や駅）」を選択・設定してください。

▼ STEP 3: 報酬振込先口座の登録
・毎月のレッスン報酬をお支払いする銀行口座情報をご登録ください。

▼ STEP 4: 業務連絡ツールの設定
レッスン稼働にあたり、以下2つのツールを使用いたします。
案内に沿ってご準備をお願いいたします。

① 本部連絡用：Google Chat
・面談時にご共有いただいた Google アカウントにて、後ほど専用チャットルームへご招待いたします。

② お客様連絡用：コーチ専用公式LINE
・事務局にて専用の公式LINEアカウントを開設いたしました。
・以下の管理者招待URLをクリックし、アカウントの管理者追加を承認してください。
【公式LINE管理者招待URL】
${targetLineUrl}

※スマートフォンでの運用となりますので、事前にスマホアプリ「LINE Official Account」のダウンロードをお願いいたします。
・iOS (App Store): https://apps.apple.com/jp/app/line-official-account/id1451478224
・Android (Google Play): https://play.google.com/store/apps/details?id=com.linecorp.lineoa

▼ STEP 5: 設定完了
・すべての入力が完了するとダッシュボードが利用可能となり、本部にて稼働準備の最終確認を行います。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

お手続きの途中でご不明な点やご質問などがございましたら、お気軽に事務局までご連絡ください。
${targetName} と一緒にレッスンをお届けできることを、スタッフ一同楽しみにしております。

何卒よろしくお願い申し上げます。

--------------------------------------------------
Swim Partners 運営事務局
Email: support@swim-partners.com
--------------------------------------------------`
    }

    const handleCopy = () => {
        const text = generateTemplate()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-1.5 border-emerald-200 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 font-semibold shadow-sm">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    採用・契約案内手順
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-gray-50/80">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[10px] sm:text-xs">
                            事務局マニュアル
                        </Badge>
                        <DialogTitle className="text-base sm:text-xl font-bold text-gray-900 leading-snug">
                            <span className="inline-block">面談後コーチ案内手順</span> ＆{' '}
                            <span className="inline-block">送信文作成</span>
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-gray-600 text-xs sm:text-sm mt-1 leading-relaxed">
                        <span className="inline-block">採用となったコーチへ契約締結・初期設定を</span>
                        <span className="inline-block">案内する手順と送信文テンプレートです。</span>
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="steps" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 sm:px-6 pt-3 border-b bg-white">
                        <TabsList className="grid grid-cols-2 w-full max-w-md h-9 sm:h-10">
                            <TabsTrigger value="steps" className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                                ① 事務局の運用手順
                            </TabsTrigger>
                            <TabsTrigger value="template" className="font-semibold text-xs sm:text-sm whitespace-nowrap">
                                ② 案内文作成・コピー
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {/* タブ1: 運用手順 */}
                        <TabsContent value="steps" className="mt-0 space-y-6">
                            <div className="grid gap-4">
                                <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0 mt-0.5">
                                        1
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-900 text-sm">コーチ専用の公式LINEアカウントを開設</h4>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            LINE Official Account Manager にてコーチ用アカウントを作成し、設定 &gt; 権限管理 &gt; 「管理者追加」より<strong>管理者招待URL</strong>を発行します。
                                        </p>
                                        <div className="flex items-center gap-1.5 pt-1 text-xs text-amber-700 font-medium">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>管理者招待URLは発行後<strong>24時間</strong>で期限切れとなるため、送付直前に発行してください。</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-600 text-white font-bold text-xs shrink-0 mt-0.5">
                                        2
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-900 text-sm">SPポータルへの招待 / アカウント作成</h4>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            本ページの「コーチ追加」または「招待リンク」からコーチのアカウントを作成・招待します。
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs shrink-0 mt-0.5">
                                        3
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-900 text-sm">ご案内文の送信（LINEまたはメール）</h4>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            本ダイアログの「② ご案内文の作成・コピー」タブでコーチ名とLINE招待URLを入力し、生成されたメッセージをコピーして送信します。
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-xl border border-purple-100 bg-purple-50/50">
                                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs shrink-0 mt-0.5">
                                        4
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-gray-900 text-sm">完了確認（契約同意ログとステータス）</h4>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                            コーチが全5ステップを完了すると、コーチ詳細画面（<code>/admin/coaches/[id]</code>）に<strong>締結日時・IPアドレス・署名者名・住所</strong>の法的な証跡ログが自動記録され、一覧のバッジが「稼働可能」に更新されます。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-gray-50 border text-xs text-gray-600 space-y-2">
                                <h5 className="font-semibold text-gray-800 flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                    オンボーディング体験デモについて
                                </h5>
                                <p>
                                    コーチが体験する画面フロー（契約同意 $\to$ プロフィール $\to$ 口座 $\to$ ツール設定）は、画面右上の「オンボーディング体験デモ」ボタンからいつでも管理者のまま安全に試すことができます。
                                </p>
                            </div>
                        </TabsContent>

                        {/* タブ2: ご案内文作成・コピー */}
                        <TabsContent value="template" className="mt-0 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border bg-gray-50">
                                <div className="space-y-1.5">
                                    <Label htmlFor="coach-name" className="text-xs font-semibold text-gray-700">
                                        コーチのお名前（姓またはフルネーム）
                                    </Label>
                                    <Input
                                        id="coach-name"
                                        placeholder="例: 佐藤"
                                        value={coachName}
                                        onChange={(e) => setCoachName(e.target.value)}
                                        className="h-9 text-sm bg-white"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="line-url" className="text-xs font-semibold text-gray-700">
                                        公式LINE 管理者招待URL
                                    </Label>
                                    <Input
                                        id="line-url"
                                        placeholder="https://line.me/R/ti/p/..."
                                        value={lineInviteUrl}
                                        onChange={(e) => setLineInviteUrl(e.target.value)}
                                        className="h-9 text-sm bg-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                                        メッセージ本文プレビュー
                                    </span>
                                    <Button
                                        onClick={handleCopy}
                                        size="sm"
                                        className={`gap-1.5 text-xs font-semibold transition-all ${
                                            copied
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                : 'bg-gray-900 hover:bg-gray-800 text-white'
                                        }`}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-3.5 w-3.5" />
                                                コピーしました！
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                全文をコピー
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <textarea
                                    readOnly
                                    rows={13}
                                    value={generateTemplate()}
                                    className="w-full text-xs font-mono p-3 rounded-lg border bg-gray-50/50 text-gray-800 focus:outline-none resize-none leading-relaxed"
                                />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
