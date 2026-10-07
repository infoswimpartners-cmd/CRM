import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * 下位互換性リダイレクト:
 * 旧URL /admin/announcements/webhooks を一元化された /admin/webhooks へ転送
 */
export default function AnnouncementsWebhookRedirectPage() {
    redirect('/admin/webhooks')
}
