'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, FileCheck } from 'lucide-react'
import { BillingApprovalList } from '@/components/admin/BillingApprovalList'
import PlanApprovalsList from '@/components/admin/PlanApprovalsList'

interface ApprovalsTabsClientProps {
    initialTab: string
    unpaidSchedules: any[]
    paidSchedules: any[]
    unpaidRegularSchedules: any[]
    paidRegularSchedules: any[]
    pendingRequests: any[]
}

export function ApprovalsTabsClient({
    initialTab,
    unpaidSchedules,
    paidSchedules,
    unpaidRegularSchedules,
    paidRegularSchedules,
    pendingRequests,
}: ApprovalsTabsClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const activeTab = searchParams.get('tab') || initialTab || 'billing'

    const handleTabChange = (value: string) => {
        router.push(`/admin/approvals?tab=${value}`, { scroll: false })
    }

    const pendingBillingCount = (unpaidSchedules?.length || 0) + (unpaidRegularSchedules?.length || 0)
    const pendingPlansCount = pendingRequests?.length || 0

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <TabsList className="bg-slate-100/80 p-1 rounded-xl h-11 border border-slate-200/60">
                    <TabsTrigger
                        value="billing"
                        className="gap-2 px-4 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs transition-all"
                    >
                        <CreditCard className="h-4 w-4" />
                        <span>レッスン請求承認</span>
                        {pendingBillingCount > 0 && (
                            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                {pendingBillingCount}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger
                        value="plans"
                        className="gap-2 px-4 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs transition-all"
                    >
                        <FileCheck className="h-4 w-4" />
                        <span>プラン変更・解約申請承認</span>
                        {pendingPlansCount > 0 && (
                            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                {pendingPlansCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="billing" className="space-y-4 focus-visible:outline-none mt-0">
                <BillingApprovalList
                    unpaidSchedules={unpaidSchedules}
                    paidSchedules={paidSchedules}
                    unpaidRegularSchedules={unpaidRegularSchedules}
                    paidRegularSchedules={paidRegularSchedules}
                />
            </TabsContent>

            <TabsContent value="plans" className="space-y-4 focus-visible:outline-none mt-0">
                <PlanApprovalsList requests={pendingRequests} />
            </TabsContent>
        </Tabs>
    )
}
