'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Calendar, CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { updateConfig } from "@/app/(dashboard)/admin/settings/actions"

interface ShinkichiCalendarSettingsFormProps {
    initialCalendarId?: string
}

export function ShinkichiCalendarSettingsForm({ initialCalendarId = '' }: ShinkichiCalendarSettingsFormProps) {
    const [calendarId, setCalendarId] = useState(initialCalendarId)
    const [savedCalendarId, setSavedCalendarId] = useState(initialCalendarId)
    const [saving, setSaving] = useState(false)

    const isDirty = calendarId.trim() !== savedCalendarId.trim()

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const trimmed = calendarId.trim()
            const res = await updateConfig('shinkichi_calendar_id', trimmed)
            if (res?.error) {
                toast.error(`設定の保存に失敗しました: ${res.error}`)
            } else {
                setSavedCalendarId(trimmed)
                toast.success(trimmed ? '新吉コーチの同期先カレンダーIDを保存しました' : '新吉コーチの同期先をメインカレンダー（primary）に設定しました')
            }
        } catch (err: any) {
            console.error('Failed to update shinkichi calendar id:', err)
            toast.error('保存中にエラーが発生しました')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-200">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="shinkichi-calendar-id" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        新吉コーチ（代表・管理者）アサイン時の同期先カレンダー
                    </Label>
                    {savedCalendarId ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                            <CheckCircle2 className="h-3 w-3 text-blue-600" />
                            専用カレンダー指定中
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            メインカレンダー（primary）
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                    新吉コーチがアサインされた際、スイムパートナーズ本部カレンダーとの<strong>二重登録を抑止</strong>し、ここで指定したカレンダーへ1件のみ予定を同期します。
                </p>
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Input
                            id="shinkichi-calendar-id"
                            value={calendarId}
                            onChange={(e) => setCalendarId(e.target.value)}
                            placeholder="例: c_xxxxxxxxxx@group.calendar.google.com または空欄"
                            className="font-mono text-xs pr-8"
                        />
                        {calendarId && (
                            <button
                                type="button"
                                onClick={() => setCalendarId('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                                title="クリアしてメインカレンダーに戻す"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <Button 
                        type="submit" 
                        disabled={saving || !isDirty}
                        size="sm"
                        className="bg-slate-900 hover:bg-slate-800 shrink-0"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                保存中...
                            </>
                        ) : (
                            '設定を保存'
                        )}
                    </Button>
                </div>
            </div>

            <div className="rounded-md bg-amber-50/70 border border-amber-200/80 p-3 text-xs text-amber-900 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                    <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>カレンダーIDの確認方法（Googleカレンダー側）</span>
                </div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-700 pl-1 text-[11px] leading-relaxed">
                    <li>PCでGoogleカレンダーを開き、同期したいカレンダーの「︙（オーバーフローメニュー）」➔「設定と共有」を開きます。</li>
                    <li>ページ下部の「カレンダーの統合」項目にある<strong>「カレンダー ID」</strong>をコピーして上記に貼り付けてください。</li>
                    <li>※空欄の場合は、Googleアカウントのメイン（primary）カレンダーに1件のみ登録されます。</li>
                </ol>
            </div>
        </form>
    )
}
