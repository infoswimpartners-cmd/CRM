
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SuccessPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    // If we wanted to show specific details, we could fetch the session from Stripe here based on session_id
    // For now, a generic success message is sufficient as the email confirms details.

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-emerald-500 h-2"></div>
                <div className="p-8 text-center space-y-6">
                    <div className="mx-auto bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center animate-bounce-slow">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-gray-900">お支払いが完了しました</h1>
                        <p className="text-gray-600 leading-relaxed">
                            体験レッスンのお申し込みありがとうございます。<br />
                            ご登録のメールアドレスに詳細をお送りしましたのでご確認ください。
                        </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 border border-gray-100">
                        <p className="mb-2">
                            <span className="font-semibold block text-gray-700">次のステップ</span>
                            レッスン当日は、指定のプールにてお待ちしております。
                            ご不明な点は、届いたメールへの返信にてお問い合わせください。
                        </p>
                    </div>

                    <div className="pt-4">
                        <Link href="/" passHref>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                                トップページへ戻る
                                <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                        Swim Partners Payment System
                    </p>
                </div>
            </div>
        </div>
    )
}
