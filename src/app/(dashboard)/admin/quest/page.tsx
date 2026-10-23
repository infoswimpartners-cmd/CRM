import { SwimPartnersQuestApp } from '@/components/quest/SwimPartnersQuestApp'
import { fetchQuestRealData } from '@/lib/quest-real-data'

export const dynamic = 'force-dynamic'

export default async function AdminSwimPartnersQuestPage() {
    const realData = await fetchQuestRealData()

    return (
        <div className="pb-12">
            <SwimPartnersQuestApp initialTab="command_center" initialRealData={realData} />
        </div>
    )
}
