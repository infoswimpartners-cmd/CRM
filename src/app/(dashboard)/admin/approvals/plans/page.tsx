import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * 下位互換性リダイレクト:
 * 旧URL /admin/approvals/plans を統合されたタブ画面 /admin/approvals?tab=plans へ転送
 */
export default function PlanApprovalsRedirectPage() {
    redirect('/admin/approvals?tab=plans')
}
