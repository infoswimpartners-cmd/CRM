'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, FileCheck } from 'lucide-react'
import { StripeInvoiceList } from '@/components/admin/StripeInvoiceList'
import PlanApprovalsList from '@/components/admin/PlanApprovalsList'
import { StripeInvoiceSummary } from '@/actions/stripe'

interface ApprovalsTabsClientProps {
    initialTab: string
    initialInvoices: StripeInvoiceSummary[]
    initialHasMore?: boolean
    initialSearchQuery?: string
    pendingRequests: any[]
    unpaidSchedules?: any[]
    paidSchedules?: any[]
    unpaidRegularSchedules?: any[]
    paidRegularSchedules?: any[]
}

export function ApprovalsTabsClient({
    initialTab,
    initialInvoices,
    initialHasMore = false,
    initialSearchQuery = '',
    pendingRequests,
}: ApprovalsTabsClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const activeTab = searchParams.get('tab') || initialTab || 'billing'

    const handleTabChange = (value: string) => {
        router.push(`/admin/approvals?tab=${value}`, { scroll: false })
    }

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
                        <span>Stripe請求・決済履歴</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="plans"
                        className="gap-2 px-4 py-2 rounded-lg text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs transition-all"
                    >
                        <FileCheck className="h-4 w-4" />
                        <span>プラン変更・解約申請</span>
                        {pendingPlansCount > 0 && (
                            <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                {pendingPlansCount}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="billing" className="space-y-4 focus-visible:outline-none mt-0">
                <StripeInvoiceList
                    initialInvoices={initialInvoices}
                    initialHasMore={initialHasMore}
                    initialSearchQuery={initialSearchQuery}
                />
            </TabsContent>

            <TabsContent value="plans" className="space-y-4 focus-visible:outline-none mt-0">
                <PlanApprovalsList requests={pendingRequests} />
            </TabsContent>
        </Tabs>
    )
}

