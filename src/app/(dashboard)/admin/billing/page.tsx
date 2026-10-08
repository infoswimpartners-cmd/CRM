
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * 下位互換性リダイレクト:
 * 旧URL /admin/billing を統合された /admin/approvals へ転送
 */
export default function BillingApprovalPage() {
    redirect('/admin/approvals')
}
