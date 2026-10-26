'use client'

import { useState, useMemo } from 'react'
import { PREFECTURES, TRAIN_LINES } from '@/lib/constants/area-stations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Train, Search, X, Plus, Building2 } from 'lucide-react'

interface AreaStationPickerProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

function parseInitial(value: string) {
    if (!value) return { cities: [], stations: [], customs: [] }
    const parts = value.split(/[,/、／\s]+/).map(p => p.trim()).filter(Boolean)
    const matchedCities: string[] = []
    const matchedStations: string[] = []
    const others: string[] = []

    const allCitiesSet = new Set(PREFECTURES.flatMap(p => p.cities))
    const allStationsSet = new Set(TRAIN_LINES.flatMap(l => l.stations))

    parts.forEach(part => {
        if (allCitiesSet.has(part)) {
            matchedCities.push(part)
        } else if (allStationsSet.has(part.replace(/駅$/, ''))) {
            matchedStations.push(part.replace(/駅$/, ''))
        } else if (part.length > 0 && !matchedCities.includes(part) && !matchedStations.includes(part)) {
            others.push(part)
        }
    })

    return {
        cities: Array.from(new Set(matchedCities)),
        stations: Array.from(new Set(matchedStations)),
        customs: Array.from(new Set(others))
    }
}

export function AreaStationPicker({ value, onChange, className }: AreaStationPickerProps) {
    const initial = useMemo(() => parseInitial(value), []) // 初回マウント時のみパース

    // 選択中のエリア・駅リストを内部管理
    const [selectedCities, setSelectedCities] = useState<string[]>(initial.cities)
    const [selectedStations, setSelectedStations] = useState<string[]>(initial.stations)
    const [customTags, setCustomTags] = useState<string[]>(initial.customs)
    const [customInput, setCustomInput] = useState('')

    // 選択中の都道府県 & 路線
    const [selectedPrefCode, setSelectedPrefCode] = useState<string>('tokyo')
    const [selectedLineId, setSelectedLineId] = useState<string>('yamanote')

    // 駅検索キーワード
    const [stationSearchQuery, setStationSearchQuery] = useState('')

    // 選択が変更されたら、1本の文字列として親コンポーネントへ通知
    const syncToParent = (cities: string[], stations: string[], customs: string[]) => {
        const sections: string[] = []

        if (cities.length > 0) {
            sections.push(cities.join('、'))
        }
        if (stations.length > 0) {
            sections.push(stations.map(s => `${s}駅`).join('、'))
        }
        if (customs.length > 0) {
            sections.push(customs.join('、'))
        }

        const formatted = sections.join(' / ')
        onChange(formatted)
    }

    // 市区町村のトグル
    const toggleCity = (city: string) => {
        const next = selectedCities.includes(city)
            ? selectedCities.filter(c => c !== city)
            : [...selectedCities, city]
        setSelectedCities(next)
        syncToParent(next, selectedStations, customTags)
    }

    // 駅のトグル
    const toggleStation = (station: string) => {
        const next = selectedStations.includes(station)
            ? selectedStations.filter(s => s !== station)
            : [...selectedStations, station]
        setSelectedStations(next)
        syncToParent(selectedCities, next, customTags)
    }

    // カスタムタグ追加
    const addCustomTag = () => {
        if (!customInput.trim()) return
        const val = customInput.trim()
        if (!customTags.includes(val) && !selectedCities.includes(val) && !selectedStations.includes(val)) {
            const next = [...customTags, val]
            setCustomTags(next)
            syncToParent(selectedCities, selectedStations, next)
        }
        setCustomInput('')
    }

    // カスタムタグ削除
    const removeCustomTag = (tag: string) => {
        const next = customTags.filter(t => t !== tag)
        setCustomTags(next)
        syncToParent(selectedCities, selectedStations, next)
    }

    // 現在選択されている都道府県データ
    const currentPref = useMemo(() => {
        return PREFECTURES.find(p => p.code === selectedPrefCode) || PREFECTURES[0]
    }, [selectedPrefCode])

    // 現在選択されている路線データ
    const currentLine = useMemo(() => {
        return TRAIN_LINES.find(l => l.id === selectedLineId) || TRAIN_LINES[0]
    }, [selectedLineId])

    // 駅検索結果
    const searchedStations = useMemo(() => {
        if (!stationSearchQuery.trim()) return []
        const query = stationSearchQuery.trim().toLowerCase().replace(/駅$/, '')
        const results: { lineName: string; station: string }[] = []

        TRAIN_LINES.forEach(line => {
            line.stations.forEach(station => {
                if (station.toLowerCase().includes(query)) {
                    if (!results.some(r => r.station === station)) {
                        results.push({ lineName: line.name, station })
                    }
                }
            })
        })
        return results.slice(0, 20)
    }, [stationSearchQuery])

    // 一括全選択 / 解除
    const selectAllGroupCities = (cities: string[]) => {
        const allIncluded = cities.every(c => selectedCities.includes(c))
        let next: string[]
        if (allIncluded) {
            next = selectedCities.filter(c => !cities.includes(c))
        } else {
            next = Array.from(new Set([...selectedCities, ...cities]))
        }
        setSelectedCities(next)
        syncToParent(next, selectedStations, customTags)
    }

    const clearAll = () => {
        setSelectedCities([])
        setSelectedStations([])
        setCustomTags([])
        onChange('')
    }

    const totalSelectedCount = selectedCities.length + selectedStations.length + customTags.length

    return (
        <div className={`space-y-4 border rounded-2xl p-4 sm:p-5 bg-white shadow-sm ${className || ''}`}>
            {/* 上部: 選択中エリア・駅のプレビュー */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-xs sm:text-sm font-bold text-slate-800">
                            選択中の活動エリア・駅 ({totalSelectedCount}件)
                        </span>
                    </div>
                    {totalSelectedCount > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAll}
                            className="text-xs text-slate-400 hover:text-red-600 h-7 px-2"
                        >
                            すべてクリア
                        </Button>
                    )}
                </div>

                {totalSelectedCount === 0 ? (
                    <div className="p-3 bg-slate-50 border border-dashed rounded-xl text-xs text-slate-400 text-center">
                        下のタブから都道府県・市区町村、または路線・駅を選択してください
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 border rounded-xl max-h-36 overflow-y-auto">
                        {/* 市区町村バッジ */}
                        {selectedCities.map(city => (
                            <Badge
                                key={city}
                                variant="secondary"
                                className="bg-blue-100 text-blue-800 border-blue-200 gap-1 pl-2.5 pr-1.5 py-1 text-xs"
                            >
                                <Building2 className="h-3 w-3 text-blue-600" />
                                {city}
                                <button
                                    type="button"
                                    onClick={() => toggleCity(city)}
                                    className="hover:bg-blue-200 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}

                        {/* 駅バッジ */}
                        {selectedStations.map(station => (
                            <Badge
                                key={station}
                                variant="secondary"
                                className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1 pl-2.5 pr-1.5 py-1 text-xs"
                            >
                                <Train className="h-3 w-3 text-emerald-600" />
                                {station}駅
                                <button
                                    type="button"
                                    onClick={() => toggleStation(station)}
                                    className="hover:bg-emerald-200 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}

                        {/* カスタムタグ */}
                        {customTags.map(tag => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="bg-slate-200 text-slate-800 border-slate-300 gap-1 pl-2.5 pr-1.5 py-1 text-xs"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => removeCustomTag(tag)}
                                    className="hover:bg-slate-300 rounded-full p-0.5"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* 選択タブ */}
            <Tabs defaultValue="area" className="w-full">
                <TabsList className="grid grid-cols-2 bg-slate-100 h-10 p-1">
                    <TabsTrigger value="area" className="text-xs sm:text-sm font-semibold gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        ① 都道府県・市区町村から選ぶ
                    </TabsTrigger>
                    <TabsTrigger value="station" className="text-xs sm:text-sm font-semibold gap-1.5">
                        <Train className="h-3.5 w-3.5" />
                        ② 路線・駅から選ぶ
                    </TabsTrigger>
                </TabsList>

                {/* ================= タブ1: 都道府県・市区町村 ================= */}
                <TabsContent value="area" className="mt-4 space-y-4">
                    {/* 都道府県選択 */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <span className="text-xs font-bold text-slate-700 shrink-0">都道府県:</span>
                        <Select value={selectedPrefCode} onValueChange={setSelectedPrefCode}>
                            <SelectTrigger className="w-full sm:w-48 bg-white h-9 text-xs font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PREFECTURES.map(pref => (
                                    <SelectItem key={pref.code} value={pref.code} className="text-xs">
                                        {pref.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 市区町村グループ一覧 */}
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                        {currentPref.groups ? (
                            currentPref.groups.map(group => {
                                const allSelected = group.cities.every(c => selectedCities.includes(c))
                                return (
                                    <div key={group.name} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-700">
                                                {group.name}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => selectAllGroupCities(group.cities)}
                                                className="text-[11px] h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            >
                                                {allSelected ? 'すべて解除' : 'まとめて全選択'}
                                            </Button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {group.cities.map(city => {
                                                const isSelected = selectedCities.includes(city)
                                                return (
                                                    <button
                                                        key={city}
                                                        type="button"
                                                        onClick={() => toggleCity(city)}
                                                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                                            isSelected
                                                                ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {city}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                                {currentPref.cities.map(city => {
                                    const isSelected = selectedCities.includes(city)
                                    return (
                                        <button
                                            key={city}
                                            type="button"
                                            onClick={() => toggleCity(city)}
                                            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            {city}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ================= タブ2: 路線・駅 ================= */}
                <TabsContent value="station" className="mt-4 space-y-4">
                    {/* 駅名インクリメンタル検索 */}
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="駅名で検索（例: 渋谷、新宿、横浜、吉祥寺）"
                            value={stationSearchQuery}
                            onChange={(e) => setStationSearchQuery(e.target.value)}
                            className="pl-9 bg-white h-9 text-xs"
                        />
                    </div>

                    {/* 検索結果がある場合 */}
                    {stationSearchQuery.trim() && (
                        <div className="p-3 bg-slate-50 rounded-xl border space-y-2">
                            <span className="text-[11px] font-bold text-slate-500">検索結果:</span>
                            {searchedStations.length === 0 ? (
                                <p className="text-xs text-slate-400">該当する駅が見つかりません</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {searchedStations.map(({ station, lineName }) => {
                                        const isSelected = selectedStations.includes(station)
                                        return (
                                            <button
                                                key={station}
                                                type="button"
                                                onClick={() => toggleStation(station)}
                                                className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                                                    isSelected
                                                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{station}駅</span>
                                                <span className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                                    ({lineName})
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 路線選択 */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <span className="text-xs font-bold text-slate-700 shrink-0">路線を選択:</span>
                        <Select value={selectedLineId} onValueChange={setSelectedLineId}>
                            <SelectTrigger className="w-full sm:w-64 bg-white h-9 text-xs font-semibold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TRAIN_LINES.map(line => (
                                    <SelectItem key={line.id} value={line.id} className="text-xs">
                                        {line.name} <span className="text-slate-400">({line.company})</span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 選択した路線の駅一覧 */}
                    <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80 max-h-52 overflow-y-auto">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
                            <span className="text-xs font-bold text-slate-700">
                                {currentLine.name} の駅一覧
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {currentLine.stations.length}駅
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {currentLine.stations.map(station => {
                                const isSelected = selectedStations.includes(station)
                                return (
                                    <button
                                        key={station}
                                        type="button"
                                        onClick={() => toggleStation(station)}
                                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                                            isSelected
                                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-sm'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                        }`}
                                    >
                                        {station}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* 自由追記・カスタムエリア入力 */}
            <div className="pt-2 border-t flex items-center gap-2">
                <Input
                    placeholder="その他のエリアや駅を自由入力（例: 〇〇プール周辺など）"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            addCustomTag()
                        }
                    }}
                    className="bg-white h-8 text-xs flex-1"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCustomTag}
                    disabled={!customInput.trim()}
                    className="h-8 px-3 text-xs gap-1 bg-white"
                >
                    <Plus className="h-3.5 w-3.5" />
                    追加
                </Button>
            </div>
        </div>
    )
}
