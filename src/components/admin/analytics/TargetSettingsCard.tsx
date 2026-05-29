'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateAppConfig } from '@/actions/app_configs'
import { ChevronDown, ChevronUp, Save, Target, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TargetSettingsCardProps {
    year: number
    initialTargets: Record<number, number>
}

export function TargetSettingsCard({ year, initialTargets }: TargetSettingsCardProps) {
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [targets, setTargets] = useState<Record<number, string>>(() => {
        const initial: Record<number, string> = {}
        for (let m = 1; m <= 12; m++) {
            initial[m] = String(initialTargets[m] || '')
        }
        return initial
    })
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    // 目標値の変更ハンドラー
    const handleChange = (month: number, value: string) => {
        // 数字のみ入力可能にする
        const numValue = value.replace(/[^0-9]/g, '')
        setTargets(prev => ({
            ...prev,
            [month]: numValue
        }))
        // メッセージを消す
        if (message) setMessage(null)
    }

    // 保存処理
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setMessage(null)

        try {
            const formattedTargets: Record<number, number> = {}
            for (let m = 1; m <= 12; m++) {
                formattedTargets[m] = targets[m] ? parseInt(targets[m], 10) : 0
            }

            const configKey = `analytics_targets_${year}`
            const result = await updateAppConfig(configKey, JSON.stringify(formattedTargets), `${year}年の月次売上目標設定`)

            if (result.success) {
                setMessage({ type: 'success', text: `${year}年の目標売上高を保存しました。` })
                router.refresh() // ページ全体のサーバーデータを更新
            } else {
                setMessage({ type: 'error', text: result.error || '保存に失敗しました。' })
            }
        } catch (err) {
            console.error('Failed to save targets:', err)
            setMessage({ type: 'error', text: '通信エラーが発生しました。' })
        } finally {
            setIsLoading(false)
        }
    }

    // 一括設定
    const handleBulkSet = () => {
        const firstMonthVal = targets[1]
        if (!firstMonthVal) {
            setMessage({ type: 'error', text: '1月の入力欄に値を入力してから一括適用してください。' })
            return
        }
        const updated: Record<number, string> = {}
        for (let m = 1; m <= 12; m++) {
            updated[m] = firstMonthVal
        }
        setTargets(updated)
        setMessage({ type: 'success', text: '1月の目標値をすべての月に一括適用しました（保存ボタンを押すと確定します）。' })
    }

    return (
        <Card className="bg-white border-slate-200 shadow-sm transition-all duration-300">
            <CardHeader 
                className="flex flex-row items-center justify-between space-y-0 py-4 px-6 cursor-pointer hover:bg-slate-50/50 transition-colors select-none rounded-t-xl"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold text-slate-800">{year}年 月次売上目標の設定</CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">各月の売上目標金額（円）を設定して、予測推移グラフに反映します</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 rounded-lg">
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
            </CardHeader>
            
            {isOpen && (
                <CardContent className="border-t border-slate-100 p-6 bg-slate-50/30">
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* アクションバー */}
                        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                            <div className="text-sm font-medium text-slate-700">
                                目標の一括コピー
                            </div>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleBulkSet}
                                className="h-9 text-xs font-semibold hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-all rounded-lg"
                            >
                                1月の目標値を全月に一括コピーする
                            </Button>
                        </div>

                        {/* 入力グリッド */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {Array.from({ length: 12 }, (_, i) => {
                                const m = i + 1
                                return (
                                    <div key={m} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1.5 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-50 transition-all">
                                        <label htmlFor={`target-${m}`} className="text-xs font-bold text-slate-500 flex justify-between">
                                            <span>{m}月</span>
                                            <span className="text-[10px] text-slate-400 font-normal">目標</span>
                                        </label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-2.5 text-xs font-bold text-slate-400">¥</span>
                                            <Input
                                                id={`target-${m}`}
                                                type="text"
                                                value={targets[m]}
                                                onChange={(e) => handleChange(m, e.target.value)}
                                                placeholder="未設定"
                                                className="pl-6 h-9 text-sm font-semibold text-slate-700 bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* メッセージ表示 */}
                        {message && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                                message.type === 'success' 
                                    ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                                    : 'bg-rose-50/50 border-rose-100 text-rose-800'
                            }`}>
                                {message.type === 'success' ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <span className="text-sm font-medium">{message.text}</span>
                            </div>
                        )}

                        {/* 送信ボタン */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="h-10 px-5 font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                {isLoading ? '保存中...' : '目標金額を保存する'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            )}
        </Card>
    )
}
