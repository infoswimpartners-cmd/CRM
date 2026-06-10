'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { ChevronLeft, MapPin, Calendar, Info, Lock } from 'lucide-react'
import Link from 'next/link'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { assignLeadAction, getDisplaySettingsAction } from '@/actions/leads'

interface Lead {
    id: string
    name: string
    full_name_kana: string | null
    gender: string | null
    birth_date: string | null
    email: string | null
    phone: string | null
    area: string | null
    lesson_location: string | null
    frequency: string | null
    available_times: string | null
    skill_level: string | null
    notes: string | null
    status: string | null
    created_at: string
    datetime1: string | null
    datetime2: string | null
    datetime3: string | null
    second_student_name: string | null
    second_student_full_name_kana: string | null
    second_student_gender: string | null
    second_student_birth_date: string | null
}

function calculateAge(birthDateString: string | null | undefined): number | null {
    if (!birthDateString) return null
    const birthDate = new Date(birthDateString)
    if (isNaN(birthDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
    }
    return age
}

export default function CoachLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [displaySettings, setDisplaySettings] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)

    // ダイアログ・アサイン用の状態
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [selectedDateKey, setSelectedDateKey] = useState<string>('datetime1')
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedLocation, setSelectedLocation] = useState('')
    const [assigning, setAssigning] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // アサイン待ちの案件（status = '募集開始' かつ assigned_coach_id が null）
            const { data: leadsData } = await supabase
                .from('leads')
                .select('*')
                .eq('status', '募集開始')
                .is('assigned_coach_id', null)
                .order('created_at', { ascending: false })

            // 表示設定の取得
            const settingsRes = await getDisplaySettingsAction()
            if (settingsRes.success) {
                setDisplaySettings(settingsRes.value)
            }

            if (leadsData) setLeads(leadsData)
        } catch (error) {
            console.error('Error fetching leads:', error)
            toast.error('データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleAssign = async () => {
        if (!selectedLead) return

        if (!selectedDate) {
            toast.error('体験日時を選択してください')
            return
        }
        if (!selectedLocation) {
            toast.error('レッスン場所を選択してください')
            return
        }

        setAssigning(true)
        try {
            const res = await assignLeadAction(selectedLead.id, selectedDate, selectedLocation)
            if (res.success) {
                toast.success('アサインが確定しました！')
                setDialogOpen(false)
                fetchData() // 案件リストを更新
            } else {
                toast.error(res.error || 'アサインに失敗しました')
            }
        } catch (error) {
            toast.error('エラーが発生しました')
            console.error(error)
        } finally {
            setAssigning(false)
        }
    }

    // 個人情報のマスク処理
    const maskName = (name: string | null | undefined): string => {
        if (!name) return '-'
        const trimmed = name.trim()
        if (trimmed.length === 0) return '-'
        return trimmed[0] + '*'
    }

    const maskPhone = (phone: string | null): string => {
        if (!phone) return '-'
        const p = phone.trim()
        if (p.length < 8) return '****'
        return p.substring(0, 3) + '****' + p.substring(p.length - 4)
    }

    const maskEmail = (email: string | null): string => {
        if (!email) return '-'
        const e = email.trim()
        const parts = e.split('@')
        if (parts.length !== 2) return '****'
        const local = parts[0]
        const domain = parts[1]
        if (local.length <= 2) {
            return local[0] + '***@' + domain
        }
        return local.substring(0, 2) + '***@' + domain
    }

    const formatAge = (birthDate: string | null | undefined, mode: string | undefined): string => {
        const age = calculateAge(birthDate)
        if (age === null) return '-'
        if (mode === 'mask') {
            return `${Math.floor(age / 10) * 10}代`
        }
        return `${age}歳`
    }

    const parseDateTimeString = (dtStr: string | null | undefined): { dateStr: string; startTime: string | null; endTime: string | null } | null => {
        if (!dtStr) return null;
        const trimmed = dtStr.trim();
        if (!trimmed) return null;

        const parts = trimmed.split(/\s+/);
        const dateStr = parts[0];
        const timeRangeStr = parts[1] || '';

        if (!timeRangeStr) {
            return { dateStr, startTime: null, endTime: null };
        }

        const timeParts = timeRangeStr.split(/[〜\-]/);
        const startTime = timeParts[0] ? timeParts[0].trim() : null;
        const endTime = timeParts[1] ? timeParts[1].trim() : null;

        return { dateStr, startTime, endTime };
    }

    const generateTimeOptions = (dtStr: string | null | undefined): { label: string; value: string }[] => {
        if (!dtStr) return [];
        
        const parsed = parseDateTimeString(dtStr);
        if (!parsed) return [];
        
        const { dateStr, startTime, endTime } = parsed;
        
        if (!startTime || !endTime) {
            return [{ label: dtStr, value: dtStr }];
        }
        
        const timeToMinutes = (t: string): number | null => {
            const match = t.match(/^(\d{1,2}):(\d{2})$/);
            if (!match) return null;
            return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        };
        
        const minutesToTime = (m: number): string => {
            const hrs = Math.floor(m / 60);
            const mins = m % 60;
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        };
        
        const startMins = timeToMinutes(startTime);
        const endMins = timeToMinutes(endTime);
        
        if (startMins === null || endMins === null || endMins - startMins < 60) {
            const timeLabel = `${startTime}〜${endTime}`;
            return [{ label: timeLabel, value: dtStr }];
        }
        
        const options: { label: string; value: string }[] = [];
        
        for (let current = startMins; current + 60 <= endMins; current += 30) {
            const currentStart = minutesToTime(current);
            const currentEnd = minutesToTime(current + 60);
            const timeLabel = `${currentStart}〜${currentEnd}`;
            const val = `${dateStr} ${timeLabel}`;
            options.push({
                label: timeLabel,
                value: val
            });
        }
        
        if (options.length === 0) {
            return [{ label: `${startTime}〜${endTime}`, value: dtStr }];
        }
        
        return options;
    }

    const formatDateLabel = (dtStr: string | null | undefined): string => {
        if (!dtStr) return '未設定';
        const parsed = parseDateTimeString(dtStr);
        if (!parsed) return dtStr;
        const { dateStr, startTime, endTime } = parsed;
        if (!startTime || !endTime) return dateStr;
        return `${dateStr} (${startTime}〜${endTime})`;
    }

    const handleDateKeyChange = (key: string, lead: Lead) => {
        setSelectedDateKey(key)
        const targetDateTime = lead[key as keyof Lead] as string | null
        const options = generateTimeOptions(targetDateTime)
        setSelectedDate(options[0]?.value || targetDateTime || '')
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/coach">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">案件紹介一覧</h1>
                    <p className="text-gray-500">現在募集中の新規体験レッスン案件</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500 font-medium">読み込み中...</div>
            ) : leads.length === 0 ? (
                <div className="text-center py-12 border border-gray-200 rounded-md bg-white text-gray-500">
                    現在アサイン可能な案件はありません。
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2">
                    {leads.map((lead) => {
                        const nameMode = displaySettings.name || 'show'
                        const nameKanaMode = displaySettings.full_name_kana || 'show'
                        const genderMode = displaySettings.gender || 'show'
                        const ageMode = displaySettings.age || 'show'
                        const emailMode = displaySettings.email || 'show'
                        const phoneMode = displaySettings.phone || 'show'
                        const areaMode = displaySettings.area || 'show'
                        const locationMode = displaySettings.lesson_location || 'show'
                        const frequencyMode = displaySettings.frequency || 'show'
                        const availableTimesMode = displaySettings.available_times || 'show'
                        const skillLevelMode = displaySettings.skill_level || 'show'
                        const notesMode = displaySettings.notes || 'show'
                        const datetimeMode = displaySettings.datetime || 'show'
                        const secondStudentMode = displaySettings.second_student || 'show'

                        const isNameMasked = nameMode === 'mask'
                        const isNameHidden = nameMode === 'hide'

                        return (
                            <Card key={lead.id} className="bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                <CardHeader className="bg-slate-50 border-b border-gray-100 py-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-0.5">
                                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                                                {isNameHidden ? (
                                                    <span>匿名希望</span>
                                                ) : isNameMasked ? (
                                                    <>
                                                        <Lock className="h-4 w-4 text-slate-400" />
                                                        <span>{maskName(lead.name)} 氏</span>
                                                    </>
                                                ) : (
                                                    <span>{lead.name} 様</span>
                                                )}
                                            </CardTitle>
                                            {nameKanaMode !== 'hide' && lead.full_name_kana && (
                                                <span className="text-[10px] text-gray-400">
                                                    {nameKanaMode === 'mask' ? maskName(lead.full_name_kana) : lead.full_name_kana}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                                            申込日: {new Date(lead.created_at).toLocaleDateString('ja-JP')}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 flex-1 space-y-4 text-sm">
                                    {/* 基本プロフィール：性別・年齢 */}
                                    {(genderMode !== 'hide' || ageMode !== 'hide') && (
                                        <div className="flex gap-4 text-xs text-gray-600 bg-slate-50/50 p-2 rounded border border-gray-100/50">
                                            {genderMode !== 'hide' && (
                                                <div>
                                                    <span className="text-gray-400 mr-1">性別:</span>
                                                    <span className="font-semibold text-slate-700">
                                                        {genderMode === 'mask' ? '*' : (lead.gender || '未設定')}
                                                    </span>
                                                </div>
                                            )}
                                            {ageMode !== 'hide' && (
                                                <div>
                                                    <span className="text-gray-400 mr-1">年齢:</span>
                                                    <span className="font-semibold text-slate-700">
                                                        {formatAge(lead.birth_date, ageMode)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(areaMode !== 'hide' || locationMode !== 'hide') && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {areaMode !== 'hide' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 font-medium">希望エリア/駅</span>
                                                    <div className="flex items-center gap-1 text-gray-700">
                                                        <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                                                        <span className="font-medium truncate">
                                                            {areaMode === 'mask' ? '***' : (lead.area || '未設定')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {locationMode !== 'hide' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 font-medium">レッスン予定場所</span>
                                                    <div className="flex items-center gap-1 text-gray-700">
                                                        <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                                                        <span className="font-semibold text-blue-600 truncate">
                                                            {locationMode === 'mask' ? '***' : (lead.lesson_location || '未設定')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {datetimeMode !== 'hide' && (
                                        <div className="space-y-1.5 border-t border-gray-100 pt-3">
                                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                希望日時リスト
                                            </span>
                                            <div className="bg-slate-50 rounded p-2.5 font-mono text-xs text-gray-600 space-y-1">
                                                {datetimeMode === 'mask' ? (
                                                    <div>***</div>
                                                ) : (
                                                    <>
                                                        <div>① {lead.datetime1 || '-'}</div>
                                                        <div>② {lead.datetime2 || '-'}</div>
                                                        <div>③ {lead.datetime3 || '-'}</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {(phoneMode !== 'hide' || emailMode !== 'hide') && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                                            {phoneMode !== 'hide' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 font-medium">電話番号</span>
                                                    <div className="text-gray-700 font-medium">
                                                        {phoneMode === 'mask' ? maskPhone(lead.phone) : (lead.phone || '-')}
                                                    </div>
                                                </div>
                                            )}
                                            {emailMode !== 'hide' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 font-medium">メールアドレス</span>
                                                    <div className="text-gray-700 truncate font-medium">
                                                        {emailMode === 'mask' ? maskEmail(lead.email) : (lead.email || '-')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(frequencyMode !== 'hide' || availableTimesMode !== 'hide') && (
                                        <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                                            {frequencyMode !== 'hide' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 font-medium">希望頻度</span>
                                                    <div className="text-gray-700 font-medium font-mono">
                                                        {frequencyMode === 'mask' ? '***' : (lead.frequency || '未設定')}
                                                    </div>
                                                </div>
                                            )}
                                            {availableTimesMode !== 'hide' && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-gray-400 font-medium">可能な曜日・時間帯</span>
                                                    <div className="text-gray-700 font-medium truncate">
                                                        {availableTimesMode === 'mask' ? '***' : (lead.available_times || '未設定')}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(skillLevelMode !== 'hide' || notesMode !== 'hide') && (
                                        <div className="border-t border-gray-100 pt-3 space-y-2">
                                            {skillLevelMode !== 'hide' && lead.skill_level && (
                                                <div className="space-y-0.5">
                                                    <span className="text-xs text-gray-400 font-medium">泳力/スキル</span>
                                                    <p className="text-gray-700 text-xs bg-slate-50 p-2 rounded">
                                                        {skillLevelMode === 'mask' ? '***' : lead.skill_level}
                                                    </p>
                                                </div>
                                            )}
                                            {notesMode !== 'hide' && lead.notes && (
                                                <div className="space-y-0.5">
                                                    <span className="text-xs text-gray-400 font-medium">その他要望・メモ</span>
                                                    <p className="text-gray-700 text-xs bg-slate-50 p-2 rounded whitespace-pre-wrap">
                                                        {notesMode === 'mask' ? '***' : lead.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {secondStudentMode !== 'hide' && lead.second_student_name && (
                                        <div className="border-t border-gray-100 pt-3 space-y-2">
                                            <span className="text-xs text-gray-400 font-bold flex items-center gap-1">
                                                👥 2人目の顧客情報
                                            </span>
                                            <div className="bg-slate-50 p-2.5 rounded text-xs space-y-1.5 border border-slate-100">
                                                <div>
                                                    <span className="text-gray-400 mr-1.5">氏名:</span>
                                                    <span className="font-semibold text-slate-700">
                                                        {secondStudentMode === 'mask' ? `${maskName(lead.second_student_name)} 氏` : `${lead.second_student_name} 様`}
                                                    </span>
                                                </div>
                                                {lead.second_student_full_name_kana && (
                                                    <div>
                                                        <span className="text-gray-400 mr-1.5">フリガナ:</span>
                                                        <span className="text-gray-600">
                                                            {secondStudentMode === 'mask' ? maskName(lead.second_student_full_name_kana) : lead.second_student_full_name_kana}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="text-gray-400 mr-1.5">性別:</span>
                                                        <span className="font-semibold text-slate-700">
                                                            {secondStudentMode === 'mask' ? '*' : (lead.second_student_gender || '未設定')}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 mr-1.5">年齢:</span>
                                                        <span className="font-semibold text-slate-700">
                                                            {formatAge(lead.second_student_birth_date, secondStudentMode)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            <CardFooter className="bg-slate-50 border-t border-gray-100 p-4 flex justify-end">
                                <Dialog open={dialogOpen && selectedLead?.id === lead.id} onOpenChange={(open) => {
                                    setDialogOpen(open)
                                    if (open) {
                                        setSelectedLead(lead)
                                        let defaultKey = 'datetime1'
                                        if (!lead.datetime1) {
                                            if (lead.datetime2) defaultKey = 'datetime2'
                                            else if (lead.datetime3) defaultKey = 'datetime3'
                                        }
                                        setSelectedDateKey(defaultKey)
                                        const targetDateTime = lead[defaultKey as keyof Lead] as string | null
                                        const options = generateTimeOptions(targetDateTime)
                                        setSelectedDate(options[0]?.value || targetDateTime || '')
                                        const locations = lead.lesson_location?.split(',').map(s => s.trim()).filter(Boolean) || []
                                        setSelectedLocation(locations[0] || '')
                                    } else {
                                        setSelectedLead(null)
                                        setSelectedDate('')
                                        setSelectedLocation('')
                                    }
                                }}>
                                    <DialogTrigger asChild>
                                        <Button
                                            size="sm"
                                            className="font-medium bg-slate-900 text-white hover:bg-slate-800"
                                            onClick={() => {
                                                setSelectedLead(lead)
                                                let defaultKey = 'datetime1'
                                                if (!lead.datetime1) {
                                                    if (lead.datetime2) defaultKey = 'datetime2'
                                                    else if (lead.datetime3) defaultKey = 'datetime3'
                                                }
                                                setSelectedDateKey(defaultKey)
                                                const targetDateTime = lead[defaultKey as keyof Lead] as string | null
                                                const options = generateTimeOptions(targetDateTime)
                                                setSelectedDate(options[0]?.value || targetDateTime || '')
                                                const locations = lead.lesson_location?.split(',').map(s => s.trim()).filter(Boolean) || []
                                                setSelectedLocation(locations[0] || '')
                                                setDialogOpen(true)
                                            }}
                                        >
                                            アサインする
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px] bg-white">
                                        <DialogHeader>
                                            <DialogTitle>案件のアサイン</DialogTitle>
                                            <DialogDescription>
                                                この体験レッスン案件をご自身が担当すること（アサイン）を確定します。
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
                                                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                <div>
                                                    確定後、お客様へ自動的に「担当コーチ決定通知」メールが送信されます。<br/>
                                                    また、案件はあなたの担当としてCRMに連動登録されます。
                                                </div>
                                            </div>
                                            <div className="space-y-3.5">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700">
                                                        希望日の選択
                                                    </label>
                                                    <Select
                                                        value={selectedDateKey}
                                                        onValueChange={(key) => handleDateKeyChange(key, lead)}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs bg-gray-50/50 border-gray-200">
                                                            <SelectValue placeholder="希望日を選択してください" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {lead.datetime1 && (
                                                                <SelectItem value="datetime1" className="text-xs">
                                                                    ① {formatDateLabel(lead.datetime1)}
                                                                </SelectItem>
                                                            )}
                                                            {lead.datetime2 && (
                                                                <SelectItem value="datetime2" className="text-xs">
                                                                    ② {formatDateLabel(lead.datetime2)}
                                                                </SelectItem>
                                                            )}
                                                            {lead.datetime3 && (
                                                                <SelectItem value="datetime3" className="text-xs">
                                                                    ③ {formatDateLabel(lead.datetime3)}
                                                                </SelectItem>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700">
                                                        体験時間の決定
                                                    </label>
                                                    <Select
                                                        value={selectedDate}
                                                        onValueChange={setSelectedDate}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs bg-gray-50/50 border-gray-200">
                                                            <SelectValue placeholder="時間を選択してください" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {generateTimeOptions(lead[selectedDateKey as keyof Lead] as string | null).map((opt, idx) => (
                                                                <SelectItem key={idx} value={opt.value} className="text-xs">
                                                                    {opt.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-700">
                                                        レッスン場所の決定
                                                    </label>
                                                    <Select
                                                        value={selectedLocation}
                                                        onValueChange={setSelectedLocation}
                                                    >
                                                        <SelectTrigger className="h-9 text-xs bg-gray-50/50 border-gray-200">
                                                            <SelectValue placeholder="場所を選択してください" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {(lead.lesson_location?.split(',').map(s => s.trim()).filter(Boolean) || []).map((loc, idx) => (
                                                                <SelectItem key={idx} value={loc} className="text-xs">
                                                                    {loc}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} disabled={assigning}>
                                                キャンセル
                                            </Button>
                                            <Button size="sm" onClick={handleAssign} disabled={assigning}>
                                                {assigning ? '処理中...' : 'アサインを確定する'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </CardFooter>
                        </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
