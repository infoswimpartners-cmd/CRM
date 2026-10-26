// src/lib/location-matcher.ts
// 顧客の希望エリア（最寄駅・区・市）から最適なレッスン候補プールを自動選定するモジュール

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * 首都圏主要エリア・駅・区・市と公営プール・主要施設の自動マッチングルール
 */
const AREA_TO_POOLS_MAP: { keywords: string[]; pools: string[] }[] = [
    // --- 東京都 23区 ---
    {
        keywords: ['目黒', '中目黒', '祐天寺', '学芸大学', '都立大学', '自由が丘', '武蔵小山'],
        pools: ['目黒区民センタープール', '碑文谷プール', '品川健康センタープール']
    },
    {
        keywords: ['港区', '品川', '田町', '三田', '白金', '白金高輪', '麻布', '六本木', '赤坂', '高輪', '芝浦', '大崎', '五反田', '大井町'],
        pools: ['港区スポーツセンタープール', '港南プール', '品川健康センタープール']
    },
    {
        keywords: ['世田谷', '三軒茶屋', '二子玉川', '成城', '下北沢', '桜新町', '用賀', '駒沢', '経堂', '千歳烏山'],
        pools: ['世田谷区総合運動場温水プール', '烏山中学校温水プール', '目黒区民センタープール']
    },
    {
        keywords: ['渋谷', '恵比寿', '広尾', '代官山', '原宿', '表参道', '代々木', '笹塚', '幡ヶ谷'],
        pools: ['ひがし健康プラザ', '猿楽トレーニングジムプール', '目黒区民センタープール']
    },
    {
        keywords: ['中央区', '日本橋', '銀座', '八重洲', '勝どき', '月島', '築地', '晴海', '東京駅'],
        pools: ['城東小学校温水プール（ヤエスク）', '中央区立総合スポーツセンター', '港南プール']
    },
    {
        keywords: ['江東区', '豊洲', '有明', '東雲', '門前仲町', '木場', '清澄白河', '東陽町', '亀戸'],
        pools: ['有明スポーツセンタープール', '江東区深川北スポーツセンター', '城東小学校温水プール（ヤエスク）']
    },
    {
        keywords: ['新宿', '高田馬場', '大久保', '新大久保', '西新宿', '神楽坂', '四谷', '信濃町'],
        pools: ['新宿コズミックスポーツセンター', '文京スポーツセンター']
    },
    {
        keywords: ['文京', '後楽園', '春日', '本郷', '茗荷谷', '白山', '千石', '湯島'],
        pools: ['文京スポーツセンター', '新宿コズミックスポーツセンター']
    },
    {
        keywords: ['千代田', '神田', '秋葉原', '御茶ノ水', '九段下', '飯田橋', '半蔵門', '麹町'],
        pools: ['城東小学校温水プール（ヤエスク）', '文京スポーツセンター']
    },
    {
        keywords: ['台東', '浅草', '上野', '御徒町', '入谷', '蔵前'],
        pools: ['台東リバーサイドスポーツセンター', '文京スポーツセンター']
    },
    {
        keywords: ['墨田', '錦糸町', '押上', '両国', '曳舟'],
        pools: ['墨田区総合体育館温水プール', '江東区深川北スポーツセンター']
    },
    {
        keywords: ['杉並', '荻窪', '高円寺', '阿佐ヶ谷', '西荻窪', '永福町', '浜田山'],
        pools: ['杉並区大宮前体育館プール', '荻窪体育館', '世田谷区総合運動場温水プール']
    },
    {
        keywords: ['中野', '東中野', '中野坂上', '新中野', '沼袋', '野方'],
        pools: ['中野区立平和の森公園キリンレモンスポーツセンター', '新宿コズミックスポーツセンター']
    },
    {
        keywords: ['大田区', '蒲田', '大森', '羽田', '平和島', '池上', '雪が谷大塚'],
        pools: ['矢口温水プール', '大田区総合体育館', '品川健康センタープール']
    },
    {
        keywords: ['練馬', '光が丘', '石神井公園', '大泉学園', '江古田'],
        pools: ['三原台温水プール', '平和台体育館温水プール']
    },
    {
        keywords: ['豊島', '池袋', '大塚', '巣鴨', '駒込', '目白', '要町'],
        pools: ['豊島区池袋スポーツセンター', '文京スポーツセンター']
    },
    {
        keywords: ['北区', '赤羽', '王子', '十条', '田端'],
        pools: ['北区元気プラザ', 'パノラマプール十条台']
    },
    {
        keywords: ['荒川', '日暮里', '南千住', '町屋'],
        pools: ['荒川総合スポーツセンター', '台東リバーサイドスポーツセンター']
    },
    {
        keywords: ['足立', '北千住', '西新井', '綾瀬', '竹ノ塚'],
        pools: ['足立区総合スポーツセンター', 'スイムスポーツセンター']
    },
    {
        keywords: ['葛飾', '亀有', '金町', '新小岩', '青砥'],
        pools: ['水元総合スポーツセンター', '奥戸総合スポーツセンター温水プール']
    },
    {
        keywords: ['江戸川', '西葛西', '葛西', '船堀', '一之江', '瑞江'],
        pools: ['江戸川区スポーツセンター', '有明スポーツセンタープール']
    },

    // --- 東京都下（多摩） ---
    {
        keywords: ['武蔵野', '吉祥寺', '三鷹'],
        pools: ['武蔵野温水プール', '三鷹市SUBARU総合スポーツセンター']
    },
    {
        keywords: ['調布', '府中', '仙川', 'つつじヶ丘', '国領', '分倍河原'],
        pools: ['調布市総合体育館プール', '府中生涯学習センター']
    },
    {
        keywords: ['八王子', '立川', '国分寺', '国立', '町田', '多摩'],
        pools: ['八王子市甲の原くらぶプール', '町田市立室内プール', '立川市泉市民体育館']
    },

    // --- 神奈川県 ---
    {
        keywords: ['横浜', '都筑', '港北', '青葉', '新横浜', 'センター南', 'センター北', '日吉', '綱島'],
        pools: ['横浜国際プール', '都筑プール', '港北スポーツセンター']
    },
    {
        keywords: ['みなとみらい', '関内', '桜木町', '元町・中華街', '戸塚', '保土ヶ谷', '金沢', '磯子', '横須賀'],
        pools: ['横浜市保土ケ谷プール', '西スポーツセンタープール', '金沢スポーツセンター']
    },
    {
        keywords: ['川崎', '武蔵小杉', '中原', '元住吉', '新丸子', '溝の口', '高津', '宮前平', '登戸'],
        pools: ['川崎市とどろきアリーナ', '中原市民館', '高津スポーツセンター']
    },

    // --- 千葉県 ---
    {
        keywords: ['千葉', '海浜幕張', '幕張', '美浜', '稲毛', '千葉みなと', '蘇我', '検見川'],
        pools: ['千葉国際総合水泳場', '美浜打瀬プール', '千葉市稲毛プール']
    },
    {
        keywords: ['船橋', '西船橋', '東船橋', '南船橋', '新船橋', '北習志野'],
        pools: ['船橋市運動公園プール', '千葉国際総合水泳場']
    },
    {
        keywords: ['市川', '本八幡', '行徳', '妙典', '市川大野'],
        pools: ['市川市塩浜市民体育館温水プール', '市川市スポーツセンター']
    },
    {
        keywords: ['浦安', '新浦安', '舞浜'],
        pools: ['浦安市運動公園総合体育館温水プール', '千葉国際総合水泳場']
    },

    // --- 埼玉県 ---
    {
        keywords: ['さいたま', '大宮', '浦和', '川口', '戸田', '蕨', '西川口'],
        pools: ['川口市青木町公園総合運動場プール', 'さいたま市記念総合体育館', '戸田市スポーツセンター']
    }
]

/**
 * 顧客のエリア文字列（最寄駅・区・希望エリア）から最適な候補プールを自動選定する
 * 
 * @param areaText 顧客の希望エリア（例: "目黒区", "品川駅徒歩圏", "船橋市", "武蔵小杉" など）
 * @param registeredFacilityNames DBのfacilitiesマスタに登録されている施設名一覧（任意）
 * @returns カンマ区切りの候補プール名（例: "目黒区民センタープール, 碑文谷プール"）
 */
export function suggestCandidateLocations(
    areaText?: string | null,
    registeredFacilityNames?: string[]
): string {
    if (!areaText || !areaText.trim()) {
        return '近隣公営プール（相談可能）'
    }

    const cleanArea = areaText.trim()
    const matchedPools: string[] = []

    // 1. エリア辞書からのキーワードマッチング
    for (const rule of AREA_TO_POOLS_MAP) {
        const isMatched = rule.keywords.some(kw => cleanArea.includes(kw))
        if (isMatched) {
            for (const pool of rule.pools) {
                if (!matchedPools.includes(pool)) {
                    matchedPools.push(pool)
                }
            }
        }
    }

    // 2. DB施設マスタが存在する場合の優先マッチング
    if (registeredFacilityNames && registeredFacilityNames.length > 0) {
        const facilityHits: string[] = []
        // エリア文字列が施設名に含まれる、または施設名の一部がエリア文字列に含まれる場合
        for (const fName of registeredFacilityNames) {
            const shortName = fName.replace(/(プール|温水|市民|区民|総合|体育館|センター)/g, '').trim()
            if (shortName && cleanArea.includes(shortName)) {
                if (!facilityHits.includes(fName)) {
                    facilityHits.push(fName)
                }
            }
        }
        // マスタに合致した施設を先頭にマージ
        if (facilityHits.length > 0) {
            matchedPools.unshift(...facilityHits)
        }
    }

    // 重複除去
    const uniquePools = Array.from(new Set(matchedPools))

    // 候補が特定できた場合は上位2〜3件を返す
    if (uniquePools.length > 0) {
        return uniquePools.slice(0, 3).join(', ')
    }

    // マッチしなかった場合の自然なフォールバック
    return `${cleanArea} 近隣の公営プール（相談可能）`
}

/**
 * Supabase DBと連動して候補場所を自動選定する非同期関数
 */
export async function autoDetectLocationForLead(
    supabaseAdmin: SupabaseClient,
    areaText?: string | null
): Promise<string> {
    try {
        const { data: facilities } = await supabaseAdmin
            .from('facilities')
            .select('name')
            .order('name', { ascending: true })

        const facilityNames = (facilities || []).map((f: { name: string }) => f.name.trim())
        return suggestCandidateLocations(areaText, facilityNames)
    } catch (err) {
        console.warn('[Location Matcher] Failed to query facilities, using rule-based suggestions:', err)
        return suggestCandidateLocations(areaText)
    }
}
