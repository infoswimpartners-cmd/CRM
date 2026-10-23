import { SwimPartnersQuestApp } from '@/components/quest/SwimPartnersQuestApp'

export const dynamic = 'force-dynamic'

export default function AdminSwimPartnersQuestPage() {
    return (
        <div className="pb-12">
            <SwimPartnersQuestApp initialTab="command_center" />
        </div>
    )
}
