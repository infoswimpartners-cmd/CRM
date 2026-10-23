import { SwimPartnersQuestApp } from '@/components/quest/SwimPartnersQuestApp'

export const dynamic = 'force-dynamic'

export default function CoachSwimPartnersQuestPage() {
    return (
        <div className="pb-12">
            <SwimPartnersQuestApp initialTab="coaches_guild" />
        </div>
    )
}
