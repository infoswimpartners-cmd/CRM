'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function StripeSyncButton() {
    const [isSyncing, setIsSyncing] = useState(false)
    const router = useRouter()

    const handleSync = async () => {
        setIsSyncing(true)
        try {
            const response = await fetch('/api/debug/sync-masters')
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Sync failed')
            }

            const { lessons, memberships } = data.results
            const successMsg = [
                lessons.processed > 0 && `レッスン: ${lessons.processed}件`,
                memberships.processed > 0 && `会員種別: ${memberships.processed}件`
            ].filter(Boolean).join(', ')

            if (successMsg) {
                toast.success(`同期完了: ${successMsg}`)
            } else {
                toast.info('同期が必要なデータはありませんでした')
            }

            if (lessons.errors.length > 0 || memberships.errors.length > 0) {
                console.error('Sync errors:', data.results)
                toast.warning('一部のデータで同期に失敗しました。コンソールを確認してください。')
            }

            router.refresh()
        } catch (error: any) {
            console.error('Sync failed:', error)
            toast.error(error.message || '同期に失敗しました')
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
        >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Stripe同期
        </Button>
    )
}
