'use client'

import { useState, useTransition, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MapPin, Waves, Plus, X, Search, Check, Sparkles, Loader2 } from 'lucide-react'
import { saveCoachLocationsAction } from '@/actions/coach-locations'

interface Facility {
    id: string
    name: string
}

interface CoachLocationPreferencesProps {
    coachId: string
    initialStations: string[]
    initialFacilityIds: string[]
    initialCustomLocations: string[]
    historicalLocations: string[]
    availableFacilities: Facility[]
    onSaved?: () => void
}

const POPULAR_STATIONS = [
    '渋谷', '新宿', '品川', '目黒', '恵比寿', '東京', '池袋', '世田谷', '中野', '吉祥寺', '横浜', '川崎', '船橋', '千葉', '浦安'
]

export function CoachLocationPreferences({
    coachId,
    initialStations,
    initialFacilityIds,
    initialCustomLocations,
    historicalLocations,
    availableFacilities,
    onSaved,
}: CoachLocationPreferencesProps) {
    const [stations, setStations] = useState<string[]>(initialStations || [])
    const [facilityIds, setFacilityIds] = useState<string[]>(initialFacilityIds || [])
    const [customLocations, setCustomLocations] = useState<string[]>(initialCustomLocations || [])
    const [newStationInput, setNewStationInput] = useState('')
    const [facilitySearch, setFacilitySearch] = useState('')
    const [isPending, startTransition] = useTransition()

    // 過去実績のあるプール名セット
    const historicalSet = useMemo(() => new Set(historicalLocations.map(h => h.trim())), [historicalLocations])

    // 施設IDから施設名へのマップ
    const facilityMap = useMemo(() => new Map(availableFacilities.map(f => [f.id, f.name])), [availableFacilities])

    // 検索フィルタリング後の施設リスト
    const filteredFacilities = useMemo(() => {
        if (!facilitySearch.trim()) {
            return availableFacilities
        }
        const query = facilitySearch.trim().toLowerCase()
        return availableFacilities.filter(f => f.name.toLowerCase().includes(query))
    }, [availableFacilities, facilitySearch])

    // 最寄駅を追加
    const handleAddStation = (stationName: string) => {
        const clean = stationName.trim().replace(/駅$/, '')
        if (!clean) return
        if (stations.includes(clean)) {
            toast.info(`「${clean}」は既に追加されています`)
            return
        }
        setStations(prev => [...prev, clean])
        setNewStationInput('')
    }

    // 最寄駅を削除
    const handleRemoveStation = (target: string) => {
        setStations(prev => prev.filter(s => s !== target))
    }

    // プール選択の切り替え
    const handleToggleFacility = (id: string) => {
        setFacilityIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        )
    }

    // カスタム場所の削除
    const handleRemoveCustomLocation = (loc: string) => {
        setCustomLocations(prev => prev.filter(l => l !== loc))
    }

    // 保存処理
    const handleSave = () => {
        startTransition(async () => {
            try {
                const res = await saveCoachLocationsAction(coachId, stations, facilityIds, customLocations)
                if (res.success) {
                    toast.success('対応可能エリア・プール設定を保存しました')
                    if (onSaved) onSaved()
                } else {
                    toast.error(res.error || '設定の保存に失敗しました')
                }
            } catch (error) {
                console.error(error)
                toast.error('エラーが発生しました')
            }
        })
    }

    return (
        <Card className="border-emerald-100 shadow-sm bg-gradient-to-b from-white to-emerald-50/20">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">
                                対応可能エリア・プール・最寄駅設定
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500">
                                新規案件が入った際、ここで設定した最寄駅やプールに基づいて優先的に個別通知されます。
                            </CardDescription>
                        </div>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                        size="sm"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                保存中...
                            </>
                        ) : (
                            '設定を保存'
                        )}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* 1. 最寄駅の設定 */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            対応可能な最寄駅
                        </label>
                        <span className="text-xs text-slate-500">複数登録可能</span>
                    </div>

                    {/* 登録済み最寄駅タグ */}
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        {stations.length === 0 ? (
                            <span className="text-xs text-slate-400 py-1">最寄駅が登録されていません。下の候補または入力欄から追加してください。</span>
                        ) : (
                            stations.map(st => (
                                <Badge
                                    key={st}
                                    variant="secondary"
                                    className="bg-white border-slate-300 text-slate-800 pl-2.5 pr-1 py-1 text-xs font-semibold flex items-center gap-1 shadow-xs hover:bg-slate-100"
                                >
                                    {st}駅
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveStation(st)}
                                        className="text-slate-400 hover:text-red-500 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))
                        )}
                    </div>

                    {/* 新規駅入力 */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="例: 渋谷、品川、目黒（駅名は省略可）"
                            value={newStationInput}
                            onChange={e => setNewStationInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    handleAddStation(newStationInput)
                                }
                            }}
                            className="text-sm bg-white"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleAddStation(newStationInput)}
                            disabled={!newStationInput.trim()}
                            className="shrink-0"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            追加
                        </Button>
                    </div>

                    {/* 主要駅のワンタップ追加候補 */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            よくある駅:
                        </span>
                        {POPULAR_STATIONS.map(st => {
                            const isAdded = stations.includes(st)
                            return (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => (isAdded ? handleRemoveStation(st) : handleAddStation(st))}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                        isAdded
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 font-medium'
                                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    {isAdded ? `✓ ${st}` : `+ ${st}`}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 2. 対応可能プールの設定 */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                            <Waves className="h-4 w-4 text-emerald-600" />
                            対応可能なプール（施設）
                        </label>
                        <span className="text-xs font-semibold text-emerald-700">
                            選択中: {facilityIds.length + customLocations.length} 箇所
                        </span>
                    </div>

                    {/* 選択済みプール一覧バッジ */}
                    {(facilityIds.length > 0 || customLocations.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-50/60 rounded-lg border border-emerald-200/60">
                            {facilityIds.map(id => {
                                const name = facilityMap.get(id) || id
                                const isHistorical = historicalSet.has(name)
                                return (
                                    <Badge
                                        key={id}
                                        className="bg-white border-emerald-300 text-emerald-900 pl-2 pr-1 py-1 text-xs font-medium flex items-center gap-1 shadow-xs hover:bg-emerald-100"
                                    >
                                        {isHistorical && <span className="text-amber-500 font-bold">★</span>}
                                        {name}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFacility(id)}
                                            className="text-slate-400 hover:text-red-500 rounded-full p-0.5 ml-0.5"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )
                            })}

                            {customLocations.map(loc => (
                                <Badge
                                    key={loc}
                                    className="bg-white border-blue-300 text-blue-900 pl-2 pr-1 py-1 text-xs font-medium flex items-center gap-1 shadow-xs"
                                >
                                    <span className="text-blue-500 font-bold">★実績</span>
                                    {loc}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveCustomLocation(loc)}
                                        className="text-slate-400 hover:text-red-500 rounded-full p-0.5 ml-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* プール検索窓 */}
                    <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                        <Input
                            placeholder="プール名・施設名で検索（例: ひがし健康プラザ、世田谷、BumB...）"
                            value={facilitySearch}
                            onChange={e => setFacilitySearch(e.target.value)}
                            className="pl-9 text-sm bg-white"
                        />
                    </div>

                    {/* 施設一覧スクロールボックス */}
                    <div className="border border-slate-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white shadow-inner">
                        {filteredFacilities.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                                該当するプールが見つかりませんでした。
                            </div>
                        ) : (
                            filteredFacilities.map(f => {
                                const isSelected = facilityIds.includes(f.id)
                                const isHistorical = historicalSet.has(f.name.trim())

                                return (
                                    <div
                                        key={f.id}
                                        onClick={() => handleToggleFacility(f.id)}
                                        className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                                            isSelected
                                                ? 'bg-emerald-50 text-emerald-900 font-semibold'
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                            <div
                                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                                        : 'border-slate-300 bg-white'
                                                }`}
                                            >
                                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                            </div>
                                            <span className="truncate">{f.name}</span>
                                            {isHistorical && (
                                                <Badge
                                                    variant="outline"
                                                    className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1 py-0 shrink-0 font-normal"
                                                >
                                                    ★ レッスン実績あり
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                        ※「★ レッスン実績あり」の施設は、過去のレッスン報告データから自動集計されています。
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
