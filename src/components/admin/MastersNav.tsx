
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function MastersNav() {
    const pathname = usePathname()

    return (
        <div className="flex gap-2 mb-6">
            <Button
                variant={pathname === '/admin/masters' ? 'default' : 'outline'}
                asChild
            >
                <Link href="/admin/masters">レッスン種類</Link>
            </Button>
            <Button
                variant={pathname.includes('/membership-types') ? 'default' : 'outline'}
                asChild
            >
                <Link href="/admin/masters/membership-types">会員区分</Link>
            </Button>
        </div>
    )
}
