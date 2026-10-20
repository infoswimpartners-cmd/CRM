'use client'

import { useEffect, useState } from 'react'
import liff from '@line/liff'
import { CreditCard, Loader2, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function StripePortalRedirectPage() {
    const [status, setStatus] = useState<'loading' | 'redirecting' | 'error'>('loading')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [portalUrl, setPortalUrl] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        async function init() {
            try {
                // 1. LIFF の初期化（LINE内ブラウザで開かれた場合）
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID || process.env.NEXT_PUBLIC_TRIAL_LIFF_ID
                let lineUserId: string | null = null

                if (liffId) {
                    try {
                        if (liff.id === null) {
                            await liff.init({ liffId })
                        }
                        if (liff.isLoggedIn()) {
                            const profile = await liff.getProfile()
                            lineUserId = profile.userId
                        }
                    } catch (liffErr) {
                        console.warn('LIFF init warning:', liffErr)
                    }
                }

                // 2. URLクエリパラメータからも補助的に取得（?lineUserId=... または ?studentId=...）
                const searchParams = new URLSearchParams(window.location.search)
                const queryLineUserId = searchParams.get('lineUserId')
                const queryStudentId = searchParams.get('studentId')

                const targetLineUserId = lineUserId || queryLineUserId

                // 3. API にポータルセッション作成をリクエスト
                const apiParams = new URLSearchParams()
                if (targetLineUserId) apiParams.set('lineUserId', targetLineUserId)
                if (queryStudentId) apiParams.set('studentId', queryStudentId)

                const res = await fetch(`/api/member/stripe-portal?${apiParams.toString()}`)
                const data = await res.json()

                if (!isMounted) return

                if (res.ok && data.url) {
                    setStatus('redirecting')
                    setPortalUrl(data.url)
                    // Stripeの安全なカスタマーポータルへ自動遷移
                    window.location.href = data.url
                } else {
                    setStatus('error')
                    setErrorMessage(data.error || 'お支払い情報の確認に失敗しました。')
                }
            } catch (err: any) {
                if (!isMounted) return
                setStatus('error')
                setErrorMessage(err.message || '通信エラーが発生しました。')
            }
        }

        init()

        return () => {
            isMounted = false
        }
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                    <CreditCard className="w-8 h-8" />
                </div>

                {status === 'loading' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-slate-800 font-bold text-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            <span>お支払い設定を確認中...</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            Stripeの安全な決済ページに接続しています。そのまま少々お待ちください。
                        </p>
                    </div>
                )}

                {status === 'redirecting' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-center gap-2 text-slate-800 font-bold text-lg">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                            <span>Stripe決済画面へ移動中...</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            自動で切り替わらない場合は、下のボタンを押してください。
                        </p>
                        {portalUrl && (
                            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl mt-4">
                                <a href={portalUrl}>
                                    クレジットカード変更画面を開く <ExternalLink className="w-4 h-4 ml-1.5" />
                                </a>
                            </Button>
                        )}
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>お支払い情報が見つかりませんでした</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                            {errorMessage}
                        </p>
                        <div className="pt-2 space-y-2">
                            <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-11 rounded-xl text-sm">
                                <Link href="/member/billing">
                                    会員マイページから開く <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" className="w-full text-slate-600 text-sm h-10">
                                <Link href="/member/login">
                                    会員ログインへ
                                </Link>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
