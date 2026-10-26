import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CoachOnboardingWizard } from '@/components/coach/CoachOnboardingWizard'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{
        demo?: string
    }>
}

export default async function CoachOnboardingPage({ searchParams }: PageProps) {
    const { demo } = await searchParams
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/login')
    }

    // デモモードは管理者ロール（admin）のみ許可
    const isDemo = demo === 'true' && profile.role === 'admin'

    // 既にオンボーディング完了済みでデモでもない場合はダッシュボードへリダイレクト
    if (profile.onboarding_completed_at && !isDemo) {
        redirect(profile.role === 'admin' ? '/admin/coaches' : '/coach')
    }

    return (
        <div className="min-h-screen py-5 sm:py-8 px-3 sm:px-6 lg:px-8 bg-slate-50/60 font-sans">
            <CoachOnboardingWizard
                isDemo={isDemo}
                profile={{
                    id: profile.id,
                    full_name: profile.full_name,
                    full_name_kana: profile.full_name_kana,
                    email: profile.email || user.email || '',
                    phone_number: profile.phone_number,
                    address: profile.address,
                    avatar_url: profile.avatar_url,
                    base_area: profile.base_area,
                    line_admin_invite_url: profile.line_admin_invite_url,
                    google_chat_email: profile.google_chat_email
                }}
            />
        </div>
    )
}
