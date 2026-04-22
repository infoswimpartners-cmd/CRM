'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash2, Save, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { DEFAULT_REWARD_SETTINGS, RewardSettings } from '@/lib/reward-system'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function RewardSettingsManager() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [settings, setSettings] = useState<RewardSettings>(DEFAULT_REWARD_SETTINGS)
    const supabase = createClient()

    useEffect(() => {
        const fetchSettings = async () => {
            const { data, error } = await supabase
                .from('app_configs')
                .select('value')
                .eq('key', 'reward_settings')
                .single()

            if (data) {
                try {
                    setSettings(JSON.parse(data.value))
                } catch (e) {
                    console.error('Failed to parse settings', e)
                }
            }
            setLoading(false)
        }
        fetchSettings()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        try {
            const { error } = await supabase
                .from('app_configs')
                .upsert({
                    key: 'reward_settings',
                    value: JSON.stringify(settings),
                    description: 'Global reward calculation settings (Rank rates, Trial rewards, etc.)',
                    updated_at: new Date().toISOString()
                })

            if (error) throw error
            toast.success('報酬設定を保存しました')
        } catch (error: any) {
            console.error(error)
            toast.error('保存に失敗しました: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const resetToDefault = () => {
        if (confirm('デフォルト設定に戻しますか？')) {
            setSettings(DEFAULT_REWARD_SETTINGS)
        }
    }

    const addThreshold = () => {
        setSettings(prev => ({
            ...prev,
            rank_thresholds: [...prev.rank_thresholds, { average: 0, rate: 0.50 }].sort((a, b) => b.average - a.average)
        }))
    }

    const removeThreshold = (index: number) => {
        setSettings(prev => ({
            ...prev,
            rank_thresholds: prev.rank_thresholds.filter((_, i) => i !== index)
        }))
    }

    const updateThreshold = (index: number, field: 'average' | 'rate', value: number) => {
        setSettings(prev => {
            const next = [...prev.rank_thresholds]
            next[index] = { ...next[index], [field]: value }
            return { ...prev, rank_thresholds: next }
        })
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-10">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">報酬計算マスタ設定</h2>
                    <p className="text-xs text-slate-500">全体に適用される報酬計算のパラメータを設定します。</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetToDefault} disabled={saving}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        デフォルトに戻す
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        設定を保存
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rank Rate Settings */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-md flex items-center gap-2">
                            ランク判定（回数ベース比率）
                        </CardTitle>
                        <CardDescription>
                            直近3ヶ月の月平均レッスン数に応じた報酬比率を設定。
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            {settings.rank_thresholds.map((t, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <div className="flex-1">
                                        <Label className="text-[10px] text-slate-500 mb-1 block">平均回数以上</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                className="h-8" 
                                                value={t.average} 
                                                onChange={e => updateThreshold(i, 'average', parseFloat(e.target.value))}
                                            />
                                            <span className="text-xs">回</span>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-[10px] text-slate-500 mb-1 block">報酬比率 (0.01=1%)</Label>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="number" 
                                                className="h-8" 
                                                step="0.01" 
                                                value={t.rate} 
                                                onChange={e => updateThreshold(i, 'rate', parseFloat(e.target.value))}
                                            />
                                            <span className="text-xs font-bold text-blue-600">{(t.rate * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 mt-4" onClick={() => removeThreshold(i)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full border-dashed" onClick={addThreshold}>
                            <Plus className="h-4 w-4 mr-2" />
                            しきい値を追加
                        </Button>
                    </CardContent>
                </Card>

                {/* Fixed Rewards & Handlers */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-md">体験レッスン・手当報酬額</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">体験報酬（標準）</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={settings.trial_standard} 
                                            onChange={e => setSettings(prev => ({ ...prev, trial_standard: parseInt(e.target.value) }))}
                                        />
                                        <span className="text-xs shrink-0">円</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">体験報酬（特殊ランク用）</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={settings.trial_special} 
                                            onChange={e => setSettings(prev => ({ ...prev, trial_special: parseInt(e.target.value) }))}
                                        />
                                        <span className="text-xs shrink-0">円</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-blue-600 font-bold">ペアレッスン手当</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={settings.pair_bonus} 
                                            onChange={e => setSettings(prev => ({ ...prev, pair_bonus: parseInt(e.target.value) }))}
                                        />
                                        <span className="text-xs shrink-0">円</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-blue-600 font-bold">施設利用手当（基本）</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={settings.facility_fee} 
                                            onChange={e => setSettings(prev => ({ ...prev, facility_fee: parseInt(e.target.value) }))}
                                        />
                                        <span className="text-xs shrink-0">円</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200 bg-slate-50">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">詳細・高度な設定</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs">特殊ランク判定比率 (0.7000001等)</Label>
                                <Input 
                                    type="number" 
                                    step="0.0000001"
                                    className="bg-white"
                                    value={settings.special_rate} 
                                    onChange={e => setSettings(prev => ({ ...prev, special_rate: parseFloat(e.target.value) }))}
                                />
                                <p className="text-[10px] text-slate-400">
                                    この値に完全に一致するランクのコーチは「体験報酬（特殊）」が適用されます。
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
