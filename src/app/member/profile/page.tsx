import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Settings, User, CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import ProfileForm from './ProfileForm'

import { getCachedMemberData } from '@/lib/member-data'

export default async function MemberProfilePage() {
    const { user, student } = await getCachedMemberData();

    if (!user) {
        redirect('/member/login')
    }

    if (!student) {
        console.error('Failed to fetch student profile')
        redirect('/member/dashboard')
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 flex items-center justify-center text-white transform rotate-3">
                    <Settings className="w-7 h-7" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-blue-900 tracking-tight">アカウント設定</h1>
                    <p className="text-sm font-bold text-blue-400 mt-1 uppercase tracking-widest">Profile Settings</p>
                </div>
            </div>

            <Card className="rounded-[2.5rem] border-none shadow-2xl bg-white/80 backdrop-blur-xl overflow-hidden mb-12">
                <CardHeader className="bg-gradient-to-br from-blue-50/50 to-white border-b border-blue-50/50 p-8">
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-blue-500" />
                        <CardTitle className="text-xl font-black text-gray-800">基本情報</CardTitle>
                    </div>
                    <CardDescription className="text-gray-500 font-medium">
                        ご登録いただいているお客様情報です。最新の情報にアップデートをお願いいたします。
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 md:p-10">
                    <ProfileForm student={student} />
                </CardContent>
            </Card>

            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white/80 backdrop-blur-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-br from-indigo-50/50 to-white border-b border-indigo-50/50 p-8">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-indigo-500" />
                        <CardTitle className="text-xl font-black text-gray-800">クレジットカード情報</CardTitle>
                    </div>
                    <CardDescription className="text-gray-500 font-medium">
                        お支払い用のクレジットカードの登録・変更・確認を安全に行えます。
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 md:p-10 flex justify-center">
                    <Link href="https://billing.stripe.com/p/login/5kQaEZ9PS6DQaSS1e11B600" target="_blank" rel="noopener noreferrer" className="w-full max-w-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3">
                        <CreditCard className="w-5 h-5" />
                        カード情報を変更する
                        <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                    </Link>
                </CardContent>
            </Card>
        </div>
    )
}
