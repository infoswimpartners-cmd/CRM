import { verifyInvitationToken } from '@/app/actions/auth-invite'
import { PasswordSetupForm } from '@/components/auth/PasswordSetupForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function InvitePage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const token = typeof searchParams.token === 'string' ? searchParams.token : ''

    const verification = await verifyInvitationToken(token)

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden font-sans">
            {/* Background Orbs (Same as Login) */}
            <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
            <div className="absolute bottom-[-20%] left-[10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s' }} />

            <Card className="w-full max-w-md relative z-10 border-white/60 shadow-xl bg-white/80 backdrop-blur-xl">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <div className="relative w-48 h-12">
                            <Image
                                src="/logo.png"
                                alt="Swim Partners"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!verification.success ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="flex justify-center">
                                <AlertCircle className="h-12 w-12 text-red-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">無効なリンクです</h3>
                            <p className="text-sm text-slate-600">
                                {verification.error || 'この招待リンクは無効か、既に期限切れです。'}
                            </p>
                            <Link href="/login" className="text-blue-600 hover:underline text-sm block mt-4">
                                ログイン画面へ戻る
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-xl font-bold text-center mb-6 text-slate-800">アカウント登録</h1>
                            <PasswordSetupForm
                                token={token}
                                email={verification.email!}
                                name={verification.name!}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
