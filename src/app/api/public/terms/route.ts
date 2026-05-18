import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // Ensure we get the latest terms

export async function GET(request: Request) {
    try {
        const adminClient = createAdminClient()

        const { data: config, error } = await adminClient
            .from('app_configs')
            .select('value')
            .eq('key', 'terms_of_service_trial')
            .single()

        if (error && error.code !== 'PGRST116') {
            // Log error but don't expose it
            console.error('Error fetching terms:', error)
            return NextResponse.json({ terms: '利用規約の読み込みに失敗しました。管理者にお問い合わせください。' }, { status: 500 })
        }

        // Return the terms or a default message if not set
        const terms = config?.value || '利用規約が設定されていません。'

        return NextResponse.json({ terms })
    } catch (error) {
        console.error('Unexpected error fetching terms:', error)
        return NextResponse.json({ terms: '利用規約の読み込みに失敗しました。' }, { status: 500 })
    }
}
