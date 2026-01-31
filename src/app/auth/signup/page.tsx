import { verifySignupToken } from '@/app/actions/auth-signup'
import { CoachSignupForm } from '@/components/auth/CoachSignupForm'
import { AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface PageProps {
    searchParams: Promise<{ token?: string }>
}

export default async function SignupPage({ searchParams }: PageProps) {
    const { token } = await searchParams

    // Verify token on server side
    const { valid, error } = await verifySignupToken(token || '')

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="mb-8 relative w-48 h-12">
                <Image
                    src="/logo.png"
                    alt="Swim Partners"
                    fill
                    className="object-contain"
                    priority
                />
            </div>

            {!valid ? (
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg text-center space-y-4">
                    <div className="mx-auto bg-red-100 p-3 rounded-full w-fit">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">リンクが無効です</h1>
                    <p className="text-gray-600">
                        {error || '招待リンクが無効か、有効期限が切れています。管理者に新しいリンクの発行を依頼してください。'}
                    </p>
                </div>
            ) : (
                <CoachSignupForm token={token || ''} />
            )}
        </div>
    )
}
