'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

export interface AgreeContractsInput {
    signerName: string
    signerAddress: string
}

export interface ContractAgreementRecord {
    id: string
    contract_type: string
    version: string
    signer_name: string
    signer_address: string
    ip_address: string
    user_agent: string
    agreed_at: string
}

/**
 * 業務委託基本契約書および報酬に関する覚書への同意ログを安全に記録する
 * 改ざん防止のため、サーバー側でService Roleを用いて正確なタイムスタンプ・IP・UAとともに挿入する
 */
export async function agreeToCoachContracts(input: AgreeContractsInput) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: '認証情報が見つかりません。再度ログインしてください。' }
        }

        const trimmedName = input.signerName?.trim()
        const trimmedAddress = input.signerAddress?.trim()

        if (!trimmedName || !trimmedAddress) {
            return { success: false, error: '署名者氏名と現住所を入力してください。' }
        }

        if (trimmedName.length > 100) {
            return { success: false, error: '氏名は100文字以内で入力してください。' }
        }

        if (trimmedAddress.length > 300) {
            return { success: false, error: '現住所は300文字以内で入力してください。' }
        }

        // リクエストヘッダーからIPアドレスとユーザーエージェントを正確に取得（x-real-ip優先）
        const headersList = await headers()
        const realIp = headersList.get('x-real-ip')
        const forwardedFor = headersList.get('x-forwarded-for')
        const ipAddress = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown')
        const userAgent = headersList.get('user-agent') || 'unknown'
        const agreedAt = new Date().toISOString()
        const version = '2026-06'

        // 契約同意レコード（基本契約・覚書の2通）を作成
        const contractsToInsert = [
            {
                coach_id: user.id,
                contract_type: 'basic_agreement',
                version: version,
                signer_name: trimmedName,
                signer_address: trimmedAddress,
                ip_address: ipAddress,
                user_agent: userAgent,
                agreed_at: agreedAt
            },
            {
                coach_id: user.id,
                contract_type: 'compensation_memorandum',
                version: version,
                signer_name: trimmedName,
                signer_address: trimmedAddress,
                ip_address: ipAddress,
                user_agent: userAgent,
                agreed_at: agreedAt
            }
        ]

        // 改ざん防止のため、Service Role経由で coach_contracts テーブルに挿入
        const adminClient = createAdminClient()
        const { error: insertError } = await adminClient
            .from('coach_contracts')
            .insert(contractsToInsert)

        if (insertError) {
            console.error('Failed to insert coach_contracts:', insertError)
            return { success: false, error: '契約同意ログの保存に失敗しました。管理者に連絡してください。' }
        }

        // profiles テーブルの氏名・現住所を同期更新
        const { error: profileError } = await adminClient
            .from('profiles')
            .update({
                full_name: trimmedName,
                address: trimmedAddress,
            })
            .eq('id', user.id)

        if (profileError) {
            console.warn('Failed to update profiles address:', profileError)
        }

        revalidatePath('/coach')
        revalidatePath('/coach/onboarding')
        return { success: true, agreedAt }
    } catch (err: any) {
        console.error('agreeToCoachContracts error:', err)
        return { success: false, error: err?.message || '契約同意処理に失敗しました。' }
    }
}

/**
 * 初回オンボーディング完了をマークする
 * セキュリティ検証: DB内に基本契約・覚書の両方の同意ログが実在することを検証した上で完了を認める
 */
export async function completeCoachOnboarding(googleChatEmail?: string) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: '認証情報が見つかりません。' }
        }

        const adminClient = createAdminClient()

        // 整合性検証: 実際に基本契約と覚書への同意ログが存在するか確認
        const { data: agreements, error: verifyError } = await adminClient
            .from('coach_contracts')
            .select('contract_type')
            .eq('coach_id', user.id)

        if (verifyError || !agreements) {
            return { success: false, error: '契約同意情報の確認に失敗しました。' }
        }

        const hasBasic = agreements.some(a => a.contract_type === 'basic_agreement')
        const hasMemo = agreements.some(a => a.contract_type === 'compensation_memorandum')

        if (!hasBasic || !hasMemo) {
            return {
                success: false,
                error: '業務委託契約書および報酬に関する覚書への同意ログが確認できません。契約に同意してから完了してください。'
            }
        }

        const now = new Date().toISOString()

        const updates: any = {
            onboarding_completed_at: now
        }
        if (googleChatEmail?.trim()) {
            updates.google_chat_email = googleChatEmail.trim()
        }

        // Service Role 経由で onboarding_completed_at を安全に更新
        const { error: updateError } = await adminClient
            .from('profiles')
            .update(updates)
            .eq('id', user.id)

        if (updateError) {
            console.error('Failed to update onboarding_completed_at:', updateError)
            return { success: false, error: 'オンボーディング状態の更新に失敗しました。' }
        }

        revalidatePath('/coach')
        revalidatePath('/coach/onboarding')
        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (err: any) {
        console.error('completeCoachOnboarding error:', err)
        return { success: false, error: err?.message || '処理中にエラーが発生しました。' }
    }
}

/**
 * コーチのGoogleチャット招待用Gmailアドレスを保存する
 */
export async function updateCoachGoogleChatEmail(email: string) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: '認証情報が見つかりません。' }
        }

        const trimmed = email.trim()
        if (!trimmed) {
            return { success: false, error: 'メールアドレスを入力してください。' }
        }

        const adminClient = createAdminClient()
        const { error } = await adminClient
            .from('profiles')
            .update({
                google_chat_email: trimmed
            })
            .eq('id', user.id)

        if (error) {
            console.error('Failed to update google_chat_email:', error)
            return { success: false, error: 'Googleチャット用メールアドレスの保存に失敗しました。' }
        }

        revalidatePath('/coach/onboarding')
        revalidatePath('/admin/coaches')
        return { success: true }
    } catch (err: any) {
        console.error('updateCoachGoogleChatEmail error:', err)
        return { success: false, error: err?.message || '処理中にエラーが発生しました。' }
    }
}

/**
 * コーチの契約同意ステータスを取得する
 */
export async function getCoachContractStatus(coachId: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('coach_contracts')
            .select('*')
            .eq('coach_id', coachId)
            .order('agreed_at', { ascending: false })

        if (error) {
            return { success: false, contracts: [] as ContractAgreementRecord[], error: error.message }
        }

        return { success: true, contracts: (data || []) as ContractAgreementRecord[] }
    } catch (err: any) {
        return { success: false, contracts: [] as ContractAgreementRecord[], error: err?.message }
    }
}

/**
 * 【管理者専用】コーチのオンボーディング完了ステータスを手動で切り替える
 * （既存コーチの救済や、面談済みコーチの個別対応用）
 */
export async function toggleCoachOnboardingStatusByAdmin(coachId: string, completed: boolean) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: '認証エラーが発生しました。' }
        }

        // 管理者権限チェック
        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!adminProfile || adminProfile.role !== 'admin') {
            return { success: false, error: 'この操作には管理者権限が必要です。' }
        }

        const adminClient = createAdminClient()
        const { error: updateError } = await adminClient
            .from('profiles')
            .update({
                onboarding_completed_at: completed ? new Date().toISOString() : null
            })
            .eq('id', coachId)

        if (updateError) {
            console.error('Failed to toggle onboarding status:', updateError)
            return { success: false, error: 'オンボーディング状態の更新に失敗しました。' }
        }

        revalidatePath(`/admin/coaches/${coachId}`)
        revalidatePath('/admin/coaches')
        revalidatePath('/coach')
        revalidatePath('/coach/onboarding')
        return { success: true }
    } catch (err: any) {
        console.error('toggleCoachOnboardingStatusByAdmin error:', err)
        return { success: false, error: err?.message || '処理中にエラーが発生しました。' }
    }
}
