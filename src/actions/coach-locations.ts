'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface CoachLocationData {
    coachId: string
    stations: string[]
    facilityIds: string[]
    customLocations: string[]
    historicalLocations: string[]
    availableFacilities: Array<{ id: string; name: string }>
    baseArea: string | null
}

/**
 * コーチの対応可能最寄駅・プール・過去実績場所を取得する
 */
export async function getCoachLocationsAction(targetCoachId?: string): Promise<{ success: boolean; data?: CoachLocationData; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: '認証されていません。' }
        }

        const supabaseAdmin = createAdminClient()

        // 操作対象のコーチID（未指定の場合はログインユーザー本人）
        const coachId = targetCoachId || user.id

        // 管理者か本人かチェック
        const { data: myProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = myProfile?.role === 'admin' || myProfile?.role === 'owner'
        if (!isAdmin && user.id !== coachId) {
            return { success: false, error: '他のコーチの設定を閲覧する権限がありません。' }
        }

        // 1. コーチのプロファイル取得（base_area）
        const { data: coachProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name, base_area')
            .eq('id', coachId)
            .single()

        // 2. 登録済み全プール（facilities）を取得
        const { data: facilities } = await supabaseAdmin
            .from('facilities')
            .select('id, name')
            .order('name', { ascending: true })

        const availableFacilities = facilities || []
        const facilityMapByName = new Map<string, string>()
        const facilityMapById = new Map<string, string>()
        availableFacilities.forEach(f => {
            facilityMapByName.set(f.name.trim(), f.id)
            facilityMapById.set(f.id, f.name.trim())
        })

        // 3. 過去のレッスン実績場所（lessons テーブル）を取得
        const { data: pastLessons } = await supabaseAdmin
            .from('lessons')
            .select('location')
            .eq('coach_id', coachId)
            .not('location', 'is', null)

        const historicalSet = new Set<string>()
        if (pastLessons) {
            pastLessons.forEach(l => {
                const loc = (l.location || '').trim()
                if (loc && loc !== 'キャンセル' && loc !== '未定') {
                    historicalSet.add(loc)
                }
            })
        }
        const historicalLocations = Array.from(historicalSet)

        // 4. app_configs から保存済み設定を取得
        const configKey = `coach_locations:${coachId}`
        const { data: configRecord } = await supabaseAdmin
            .from('app_configs')
            .select('value')
            .eq('key', configKey)
            .maybeSingle()

        let stations: string[] = []
        let facilityIds: string[] = []
        let customLocations: string[] = []

        if (configRecord?.value) {
            try {
                const parsed = JSON.parse(configRecord.value)
                stations = Array.isArray(parsed.stations) ? parsed.stations : []
                facilityIds = Array.isArray(parsed.facilityIds) ? parsed.facilityIds : []
                customLocations = Array.isArray(parsed.customLocations) ? parsed.customLocations : []
            } catch (e) {
                console.error('Failed to parse coach_locations config:', e)
            }
        } else {
            // 初回アクセス時: 過去のレッスン実績から施設IDおよびカスタム場所を自動初期紐付け！
            historicalLocations.forEach(loc => {
                const matchedFacilityId = facilityMapByName.get(loc)
                if (matchedFacilityId) {
                    if (!facilityIds.includes(matchedFacilityId)) {
                        facilityIds.push(matchedFacilityId)
                    }
                } else {
                    // facilities に完全一致しない過去実績場所（学校プールなど）
                    if (!customLocations.includes(loc)) {
                        customLocations.push(loc)
                    }
                }
            })

            // base_area からも駅名・地域名などの初期抽出を試行
            if (coachProfile?.base_area) {
                const parts = coachProfile.base_area
                    .split(/[、,／/\s\n]+/)
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0 && !s.includes('エリア') && !s.includes('23区'))
                parts.forEach((p: string) => {
                    if (!stations.includes(p) && p.length <= 10) {
                        stations.push(p)
                    }
                })
            }
        }

        return {
            success: true,
            data: {
                coachId,
                stations,
                facilityIds,
                customLocations,
                historicalLocations,
                availableFacilities,
                baseArea: coachProfile?.base_area || null,
            }
        }
    } catch (err: any) {
        console.error('getCoachLocationsAction Error:', err)
        return { success: false, error: err.message || 'コーチのエリア設定取得に失敗しました。' }
    }
}

/**
 * コーチの対応可能最寄駅・プール・カスタム場所を保存する
 */
export async function saveCoachLocationsAction(
    coachId: string,
    stations: string[],
    facilityIds: string[],
    customLocations: string[] = []
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: '認証されていません。' }
        }

        const supabaseAdmin = createAdminClient()

        // 管理者か本人かチェック
        const { data: myProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = myProfile?.role === 'admin' || myProfile?.role === 'owner'
        if (!isAdmin && user.id !== coachId) {
            return { success: false, error: '他のコーチの設定を変更する権限がありません。' }
        }

        // 重複排除とクリーニング
        const cleanStations = Array.from(new Set(stations.map(s => s.trim()).filter(Boolean)))
        const cleanFacilityIds = Array.from(new Set(facilityIds.filter(Boolean)))
        const cleanCustomLocations = Array.from(new Set(customLocations.map(s => s.trim()).filter(Boolean)))

        // 施設名を取得して base_area 文字列を生成
        const { data: facilities } = await supabaseAdmin
            .from('facilities')
            .select('id, name')
            .in('id', cleanFacilityIds)

        const facilityNames = (facilities || []).map(f => f.name.trim())
        const allLocationNames = [...cleanCustomLocations, ...facilityNames]

        // 既存の base_area を取得し、スマートに更新
        const summaryParts: string[] = []
        if (cleanStations.length > 0) {
            summaryParts.push(`最寄駅: ${cleanStations.join('、')}`)
        }
        if (allLocationNames.length > 0) {
            summaryParts.push(`対応プール: ${allLocationNames.slice(0, 5).join('、')}${allLocationNames.length > 5 ? ` 等${allLocationNames.length}箇所` : ''}`)
        }
        const updatedBaseArea = summaryParts.join(' / ') || null

        // 1. app_configs に構造化JSONを保存
        const configKey = `coach_locations:${coachId}`
        const configValue = JSON.stringify({
            stations: cleanStations,
            facilityIds: cleanFacilityIds,
            customLocations: cleanCustomLocations,
            updated_at: new Date().toISOString()
        })

        const { error: configError } = await supabaseAdmin
            .from('app_configs')
            .upsert({
                key: configKey,
                value: configValue,
                description: `コーチ (${coachId}) の対応可能最寄駅およびプール設定`,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' })

        if (configError) throw configError

        // 2. profiles.base_area も同期更新
        if (updatedBaseArea) {
            await supabaseAdmin
                .from('profiles')
                .update({ base_area: updatedBaseArea })
                .eq('id', coachId)
        }

        revalidatePath('/coach/profile')
        revalidatePath(`/admin/coaches/${coachId}`)
        return { success: true }
    } catch (err: any) {
        console.error('saveCoachLocationsAction Error:', err)
        return { success: false, error: err.message || '設定の保存に失敗しました。' }
    }
}
