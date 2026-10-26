// src/lib/location-matcher.ts
// 顧客の希望エリア（最寄駅・区・市）からマスタ登録施設（facilities）のみを厳格に自動選定するモジュール

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 顧客のエリアキーワード（区・市・駅名）とマスタ登録施設名の対応マッピング
 * ※ここに記載する施設名は、必ず facilities マスタに実在する正式名称のみを定義します。
 */
const AREA_TO_MASTER_FACILITIES_MAP: { keywords: string[]; facilityNames: string[] }[] = [
    // --- 目黒区 ---
    {
        keywords: ['目黒', '中目黒', '祐天寺', '学芸大学', '都立大学', '自由が丘', '五本木'],
        facilityNames: ['目黒区民センター屋内プール', '南部地区プール（目黒）', '目黒区立　西部地区プール', '五本木小学校']
    },
    // --- 港区・品川区 ---
    {
        keywords: ['港区', '品川', '田町', '三田', '白金', '白金高輪', '麻布', '六本木', '赤坂', '高輪', '芝浦', '大崎', '五反田', '大井町', '武蔵小山'],
        facilityNames: ['港南プール', '品川学園温水プール', '日野学園温水プール', '三田中学校', '御成門中学校', '高松中学校', 'ワールドシティータワーズ', 'ワールドシティータワーズ（品川駅）']
    },
    // --- 世田谷区 ---
    {
        keywords: ['世田谷', '三軒茶屋', '二子玉川', '成城', '下北沢', '桜新町', '用賀', '駒沢', '経堂', '千歳烏山', '千歳'],
        facilityNames: ['世田谷区立総合運動場', '世田谷区千歳温水プール', '玉川中学校温水プール']
    },
    // --- 渋谷区 ---
    {
        keywords: ['渋谷', '恵比寿', '広尾', '代官山', '原宿', '表参道', '代々木', '笹塚', '幡ヶ谷', '千駄ヶ谷'],
        facilityNames: ['ひがし健康プラザ', '代官山スポーツプラザ', '渋谷区スポーツセンター', '上原中学校', '東京体育館']
    },
    // --- 中央区 ---
    {
        keywords: ['中央区', '日本橋', '銀座', '八重洲', '勝どき', '月島', '築地', '晴海', '東京駅'],
        facilityNames: ['城東小学校', '中央区立総合スポーツセンター', '日本橋小学校', '晴美西小学校']
    },
    // --- 千代田区 ---
    {
        keywords: ['千代田', '神田', '秋葉原', '御茶ノ水', '九段下', '飯田橋', '半蔵門', '麹町'],
        facilityNames: ['麹町小学校', '城東小学校']
    },
    // --- 江東区 ---
    {
        keywords: ['江東区', '豊洲', '有明', '東雲', '門前仲町', '木場', '清澄白河', '東陽町', '亀戸', '辰巳', '新木場'],
        facilityNames: ['有明スポーツセンター', '深川北スポーツセンター', '江東区スポーツ会館', '東京アクアティクスセンター', 'BumB東京スポーツ文化館']
    },
    // --- 墨田区 ---
    {
        keywords: ['墨田', '錦糸町', '押上', '両国', '曳舟'],
        facilityNames: ['ひがしんアリーナ']
    },
    // --- 杉並区 ---
    {
        keywords: ['杉並', '荻窪', '高円寺', '阿佐ヶ谷', '西荻窪', '高井戸', '永福町', '浜田山'],
        facilityNames: ['杉並第十小学校温水プール', '高井戸温水プール']
    },
    // --- 練馬区 ---
    {
        keywords: ['練馬', '光が丘', '石神井公園', '大泉学園', '江古田'],
        facilityNames: ['練馬区立光が丘体育館']
    },
    // --- 大田区 ---
    {
        keywords: ['大田区', '蒲田', '大森', '矢口', '羽田', '平和島', '池上', '雪が谷大塚'],
        facilityNames: ['矢口区民センター']
    },
    // --- 江戸川区 ---
    {
        keywords: ['江戸川', '西葛西', '葛西', '船堀', '一之江', '瑞江'],
        facilityNames: ['江戸川区スポーツセンター']
    },
    // --- 多摩エリア ---
    {
        keywords: ['武蔵野', '吉祥寺', '三鷹'],
        facilityNames: ['武蔵野市総合体育館']
    },
    {
        keywords: ['小金井'],
        facilityNames: ['小金井総合体育館']
    },
    {
        keywords: ['小平'],
        facilityNames: ['小平市民総合体育館プール']
    },
    {
        keywords: ['町田'],
        facilityNames: ['町田第一中学校']
    },
    // --- 神奈川県 ---
    {
        keywords: ['横浜', '都筑', '港北', '青葉', '新横浜', 'センター南', 'センター北', '日吉', '綱島', '西区'],
        facilityNames: ['横浜国際プール', '西スポーツセンター']
    },
    // --- 千葉県 ---
    {
        keywords: ['船橋', '西船橋', '東船橋', '南船橋', '新船橋', '北習志野'],
        facilityNames: ['船橋アリーナ', '船橋メグスパ']
    },
    {
        keywords: ['浦安', '新浦安', '舞浜'],
        facilityNames: ['浦安市屋内プール（バルドラール浦安）', 'グランドニッコー東京ベイ　舞浜']
    },
    {
        keywords: ['千葉', '海浜幕張', '幕張', '美浜', '稲毛', '千葉みなと', '蘇我'],
        facilityNames: ['千葉国際水泳場', '千葉公園']
    },
    // --- 埼玉県 ---
    {
        keywords: ['和光'],
        facilityNames: ['和光市広沢複合施設「わぴあ」']
    }
]

/**
 * 顧客のエリア文字列から、マスタ登録施設（facilities）のみを厳格に照合して候補を返す
 * ※マスタ（registeredFacilities）に存在しない施設は一切記載・返却しません。
 * 
 * @param areaText 顧客の希望エリア（例: "目黒区", "品川駅", "世田谷", "船橋市" など）
 * @param registeredFacilities DBのfacilitiesマスタに登録されている施設オブジェクト一覧（または施設名一覧）
 * @returns マスタ登録施設名のみで構成されたカンマ区切り文字列（例: "目黒区民センター屋内プール, 南部地区プール（目黒）"）
 */
export function suggestCandidateLocations(
    areaText?: string | null,
    registeredFacilities?: ({ name: string; nearest_station?: string | null } | string)[]
): string {
    if (!areaText || !areaText.trim()) {
        return '近隣施設（生徒様と相談の上決定）'
    }

    const cleanArea = areaText.trim()

    // 1. マスタ登録施設名のホワイトリストセットを構築
    const masterFacilityNames: string[] = []
    const stationMap: { facilityName: string; station: string }[] = []

    if (registeredFacilities && registeredFacilities.length > 0) {
        registeredFacilities.forEach(f => {
            if (typeof f === 'string') {
                masterFacilityNames.push(f.trim())
            } else if (f && typeof f.name === 'string') {
                masterFacilityNames.push(f.name.trim())
                if (f.nearest_station && typeof f.nearest_station === 'string') {
                    stationMap.push({ facilityName: f.name.trim(), station: f.nearest_station.trim() })
                }
            }
        })
    }

    // マスタが渡されていない場合でも、安全のためマスタ外の施設は出力しない（空配列）
    const masterWhitelistSet = new Set(masterFacilityNames)

    const candidates: string[] = []

    // 2. マスタ登録施設の最寄駅（nearest_station）が登録されている場合、最優先で完全照合
    if (stationMap.length > 0) {
        for (const item of stationMap) {
            if (item.station && cleanArea.includes(item.station)) {
                if (masterWhitelistSet.has(item.facilityName) && !candidates.includes(item.facilityName)) {
                    candidates.push(item.facilityName)
                }
            }
        }
    }

    // 3. マスタ施設名そのものが顧客エリアに含まれる、または施設名から地域キーワードを部分照合
    for (const fName of masterFacilityNames) {
        // 施設名から一般的な名詞（温水プール、体育館等）を取り除いた地名キーワード
        const cleanName = fName.replace(/(屋内|温水|プール|区民|市民|スポーツ|センター|体育館|中学校|小学校|学園|施設)/g, '').trim()
        if (cleanName.length >= 2 && cleanArea.includes(cleanName)) {
            if (masterWhitelistSet.has(fName) && !candidates.includes(fName)) {
                candidates.push(fName)
            }
        }
    }

    // 4. エリア辞書パターンに基づくマスタ施設のマッチング
    for (const rule of AREA_TO_MASTER_FACILITIES_MAP) {
        const isMatched = rule.keywords.some(kw => cleanArea.includes(kw))
        if (isMatched) {
            for (const fName of rule.facilityNames) {
                // 【厳格制約】マスタホワイトリストに存在するか判定（マスタ渡された場合）
                const isValidInMaster = masterFacilityNames.length === 0 || masterWhitelistSet.has(fName)
                if (isValidInMaster && !candidates.includes(fName)) {
                    candidates.push(fName)
                }
            }
        }
    }

    // 5. 【最終フィルタ】マスタ一覧が取得できている場合は、確実にマスタ登録施設のみに厳格制限
    const strictlyVerifiedCandidates = masterFacilityNames.length > 0
        ? candidates.filter(name => masterWhitelistSet.has(name))
        : candidates

    // 上位最大3件を抽出
    if (strictlyVerifiedCandidates.length > 0) {
        return strictlyVerifiedCandidates.slice(0, 3).join(', ')
    }

    // マスタに合致する施設がない場合、マスタ未登録施設名は一切出さず、相談ベースの表現にする
    return '近隣施設（生徒様と相談の上決定）'
}

/**
 * Supabase DB（facilitiesテーブル）とリアルタイム連携し、
 * マスタ登録施設の中から最適な候補プールを厳格選定する非同期関数
 */
export async function autoDetectLocationForLead(
    supabaseAdmin: SupabaseClient,
    areaText?: string | null
): Promise<string> {
    try {
        const { data: facilities } = await supabaseAdmin
            .from('facilities')
            .select('*')
            .order('name', { ascending: true })

        return suggestCandidateLocations(areaText, facilities || [])
    } catch (err) {
        console.warn('[Location Matcher] Failed to query facilities from DB:', err)
        return suggestCandidateLocations(areaText, [])
    }
}
