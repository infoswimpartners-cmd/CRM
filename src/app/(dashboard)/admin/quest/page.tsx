import { SwimPartnersQuestApp } from '@/components/quest/SwimPartnersQuestApp'
import { fetchQuestRealData } from '@/lib/quest-real-data'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminSwimPartnersQuestPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // コーチ等の非管理者ロールはアクセス不可とし、コーチダッシュボードへリダイレクト
    if (profile?.role !== 'admin') {
        redirect('/coach')
    }

    const realData = await fetchQuestRealData()

    return (
        <div className="pb-12">
            <SwimPartnersQuestApp initialTab="command_center" initialRealData={realData} />
        </div>
    )
}
