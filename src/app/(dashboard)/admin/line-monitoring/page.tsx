'use client'

import React, { useState, useEffect } from 'react'
import { 
    getLineMonitoringLogsAction, 
    updateLogStatusAction, 
    getLineBotConfigsAction, 
    saveLineBotConfigAction, 
    deleteLineBotConfigAction,
    getCoachesListAction,
    findStudentByLineInfoAction,
    getLessonMastersListAction,
    getStudentsSimpleListAction,
    LineMonitoringLog,
    LineBotConfig
} from '@/actions/line-monitoring'
import { createLessonSchedule } from '@/actions/lesson_schedule'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { 
    MessageSquare, 
    Bot, 
    User, 
    Calendar, 
    Check, 
    Plus, 
    Trash2, 
    Filter, 
    RefreshCw, 
    AlertCircle, 
    ArrowRightLeft,
    Clock,
    CalendarPlus
} from 'lucide-react'

/**
 * LINEメッセージから日付と時刻を簡易パースします
 */
function parseDateTimeFromMessage(text: string): { start: string; end: string } | null {
    if (!text) return null;

    const now = new Date();
    let year = now.getFullYear();
    let month = -1;
    let day = -1;
    let hour = -1;
    let minute = 0;

    const datePatternA = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/;
    const datePatternB = /(\d{1,2})\s*\/\s*(\d{1,2})/;

    let match = text.match(datePatternA);
    if (match) {
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
    } else {
        match = text.match(datePatternB);
        if (match) {
            month = parseInt(match[1]) - 1;
            day = parseInt(match[2]);
        }
    }

    if (month === -1 || day === -1) {
        return null;
    }

    // 年の補正（12月に1月の予約をするなど、明らかに過去の場合は来年にする）
    if (month < now.getMonth() && (now.getMonth() - month) > 6) {
        year += 1;
    }

    const timePatternA = /(\d{1,2})\s*時\s*(\d{1,2})\s*分/;
    const timePatternB = /(\d{1,2})\s*時/;
    const timePatternC = /(\d{1,2})\s*:\s*(\d{2})/;

    let timeMatch = text.match(timePatternA);
    if (timeMatch) {
        hour = parseInt(timeMatch[1]);
        minute = parseInt(timeMatch[2]);
    } else {
        timeMatch = text.match(timePatternC);
        if (timeMatch) {
            hour = parseInt(timeMatch[1]);
            minute = parseInt(timeMatch[2]);
        } else {
            timeMatch = text.match(timePatternB);
            if (timeMatch) {
                hour = parseInt(timeMatch[1]);
                minute = 0;
            }
        }
    }

    if (hour === -1) {
        hour = 10;
        minute = 0;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
    
    // 終了時刻（1時間後）
    let endHour = hour + 1;
    let endDay = day;
    let endMonth = month;
    let endYear = year;
    if (endHour >= 24) {
        endHour = endHour - 24;
        const tempDate = new Date(year, month, day + 1);
        endYear = tempDate.getFullYear();
        endMonth = tempDate.getMonth();
        endDay = tempDate.getDate();
    }
    const endStr = `${endYear}-${pad(endMonth + 1)}-${pad(endDay)}T${pad(endHour)}:${pad(minute)}`;

    return { start: startStr, end: endStr };
}

export default function LineMonitoringPage() {
    // 状態定義
    const [activeTab, setActiveTab] = useState('logs')
    const [logs, setLogs] = useState<LineMonitoringLog[]>([])
    const [configs, setConfigs] = useState<LineBotConfig[]>([])
    const [coaches, setCoaches] = useState<{ id: string; full_name: string | null; role: string | null }[]>([])
    
    // フィルター状態
    const [filterCoach, setFilterCoach] = useState('all')
    const [filterStatus, setFilterStatus] = useState<any>('unread')
    
    // ボット設定フォーム状態
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [editingConfig, setEditingConfig] = useState<LineBotConfig | null>(null)
    const [formCoachId, setFormCoachId] = useState('')
    const [formBotId, setFormBotId] = useState('')
    const [formBotName, setFormBotName] = useState('')

    // ローディング状態
    const [isLoadingLogs, setIsLoadingLogs] = useState(true)
    const [isLoadingConfigs, setIsLoadingConfigs] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // スケジュール簡易登録フォーム状態
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
    const [selectedLogForSchedule, setSelectedLogForSchedule] = useState<LineMonitoringLog | null>(null)
    const [scheduleStudentId, setScheduleStudentId] = useState('')
    const [scheduleLessonMasterId, setScheduleLessonMasterId] = useState('')
    const [scheduleStartTime, setScheduleStartTime] = useState('')
    const [scheduleEndTime, setScheduleEndTime] = useState('')
    const [scheduleTitle, setScheduleTitle] = useState('レッスン')
    const [scheduleLocation, setScheduleLocation] = useState('')
    const [scheduleNotes, setScheduleNotes] = useState('')

    // マスタデータおよび検索結果状態
    const [lessonMasters, setLessonMasters] = useState<{ id: string; name: string; price: number; is_trial: boolean }[]>([])
    const [allStudents, setAllStudents] = useState<{ id: string; full_name: string }[]>([])
    const [studentCandidates, setStudentCandidates] = useState<{ id: string; full_name: string; line_user_id: string | null }[]>([])
    const [isSearchingStudent, setIsSearchingStudent] = useState(false)
    const [isRegisteringSchedule, setIsRegisteringSchedule] = useState(false)

    // 初期フェッチ
    useEffect(() => {
        fetchCoaches()
        fetchLogs()
        fetchConfigs()
    }, [])

    // フィルター変更時に再フェッチ
    useEffect(() => {
        fetchLogs()
    }, [filterCoach, filterStatus])

    // コーチ一覧取得
    const fetchCoaches = async () => {
        const res = await getCoachesListAction()
        if (res.success) {
            setCoaches(res.data || [])
        } else {
            toast.error('コーチ情報の取得に失敗しました: ' + res.error)
        }
    }

    // ログ取得
    const fetchLogs = async () => {
        setIsLoadingLogs(true)
        const filters = {
            coachId: filterCoach,
            status: filterStatus
        }
        const res = await getLineMonitoringLogsAction(filters)
        if (res.success) {
            setLogs(res.data || [])
        } else {
            toast.error('ログの取得に失敗しました: ' + res.error)
        }
        setIsLoadingLogs(false)
    }

    // ボット設定取得
    const fetchConfigs = async () => {
        setIsLoadingConfigs(true)
        const res = await getLineBotConfigsAction()
        if (res.success) {
            setConfigs(res.data || [])
        } else {
            toast.error('設定の取得に失敗しました: ' + res.error)
        }
        setIsLoadingConfigs(false)
    }

    // ステータス更新処理
    const handleUpdateStatus = async (logId: string, currentStatus: 'unread' | 'checked') => {
        const nextStatus = currentStatus === 'unread' ? 'checked' : 'unread'
        const res = await updateLogStatusAction(logId, nextStatus)
        if (res.success) {
            toast.success(nextStatus === 'checked' ? 'ログを確認済みにしました' : 'ログを未確認に戻しました')
            // ローカルステートを即時更新してスムーズな操作感を提供する
            setLogs(prev => prev.map(log => log.id === logId ? { ...log, status: nextStatus } : log))
        } else {
            toast.error('ステータス更新に失敗しました: ' + res.error)
        }
    }

    // スケジュール簡易登録モーダルを開く
    const handleOpenScheduleModal = async (log: LineMonitoringLog) => {
        setSelectedLogForSchedule(log)
        setScheduleStudentId('')
        setStudentCandidates([])
        setScheduleLocation('')
        setScheduleTitle('レッスン')
        setScheduleNotes(`LINEメッセージ:\n「${log.message_text}」`)
        
        // 1. 日付の簡易パース
        const parsed = parseDateTimeFromMessage(log.message_text)
        if (parsed) {
            setScheduleStartTime(parsed.start)
            setScheduleEndTime(parsed.end)
        } else {
            // パースできない場合は明日の午前10時〜11時をデフォルトに
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const pad = (n: number) => String(n).padStart(2, '0')
            const startStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`
            const endStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T11:00`
            setScheduleStartTime(startStr)
            setScheduleEndTime(endStr)
        }

        setIsScheduleDialogOpen(true)
        setIsSearchingStudent(true)

        // 2. 生徒の特定・マスタデータのフェッチ
        try {
            const [studentRes, mastersRes, studentsListRes] = await Promise.all([
                findStudentByLineInfoAction(log.line_user_id, log.line_display_name),
                getLessonMastersListAction(),
                getStudentsSimpleListAction()
            ])

            if (studentRes.success) {
                if (studentRes.match) {
                    setScheduleStudentId(studentRes.match.id)
                    setScheduleTitle(`レッスン (${studentRes.match.full_name})`)
                } else if (studentRes.candidates && studentRes.candidates.length > 0) {
                    setStudentCandidates(studentRes.candidates)
                }
            }

            if (mastersRes.success) {
                setLessonMasters(mastersRes.data || [])
                const defaultMaster = mastersRes.data?.find(m => !m.is_trial) || mastersRes.data?.[0]
                if (defaultMaster) {
                    setScheduleLessonMasterId(defaultMaster.id)
                }
            }

            if (studentsListRes.success) {
                setAllStudents(studentsListRes.data || [])
            }

        } catch (e) {
            console.error('Fetch schedule dynamic data error:', e)
            toast.error('マスタデータの取得に失敗しました')
        } finally {
            setIsSearchingStudent(false)
        }
    }

    // スケジュール登録実行
    const handleRegisterSchedule = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedLogForSchedule) return
        if (!scheduleStudentId) {
            toast.error('生徒を選択してください')
            return
        }
        if (!scheduleLessonMasterId) {
            toast.error('レッスン種別を選択してください')
            return
        }
        if (!scheduleStartTime || !scheduleEndTime) {
            toast.error('日時を選択してください')
            return
        }

        setIsRegisteringSchedule(true)
        try {
            const res = await createLessonSchedule({
                coach_id: selectedLogForSchedule.coach_id,
                student_id: scheduleStudentId,
                lesson_master_id: scheduleLessonMasterId,
                start_time: new Date(scheduleStartTime).toISOString(),
                end_time: new Date(scheduleEndTime).toISOString(),
                title: scheduleTitle,
                location: scheduleLocation,
                notes: scheduleNotes
            })

            if (res && res.success) {
                toast.success('全体スケジュールにレッスンを登録しました')
                
                // 監視ログのステータスを自動的に確認済にする
                if (selectedLogForSchedule.status === 'unread') {
                    await updateLogStatusAction(selectedLogForSchedule.id, 'checked')
                }

                setIsScheduleDialogOpen(false)
                fetchLogs() // ログ一覧の更新
            } else {
                toast.error('スケジュールの登録に失敗しました: ' + (res?.error || '不明なエラー'))
            }
        } catch (error: any) {
            console.error('Register schedule error:', error)
            toast.error('スケジュール登録中にエラーが発生しました: ' + error.message)
        } finally {
            setIsRegisteringSchedule(false)
        }
    }

    // ボット設定保存処理 (新規/編集)
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formCoachId || !formBotId || !formBotName) {
            toast.error('すべての項目を入力してください')
            return
        }

        setIsSaving(true)
        const res = await saveLineBotConfigAction({
            id: editingConfig?.id,
            coach_id: formCoachId,
            bot_id: formBotId.trim(),
            bot_name: formBotName.trim()
        })

        setIsSaving(false)
        if (res.success) {
            toast.success(editingConfig ? 'ボットの紐付け設定を更新しました' : 'ボットの紐付け設定を登録しました')
            setIsAddDialogOpen(false)
            resetForm()
            fetchConfigs()
        } else {
            toast.error('設定の保存に失敗しました: ' + res.error)
        }
    }

    // ボット設定削除処理
    const handleDeleteConfig = async (configId: string) => {
        if (!confirm('このボットの紐付け設定を削除してよろしいですか？')) return

        const res = await deleteLineBotConfigAction(configId)
        if (res.success) {
            toast.success('設定を削除しました')
            fetchConfigs()
        } else {
            toast.error('設定の削除に失敗しました: ' + res.error)
        }
    }

    const startEditConfig = (config: LineBotConfig) => {
        setEditingConfig(config)
        setFormCoachId(config.coach_id)
        setFormBotId(config.bot_id)
        setFormBotName(config.bot_name)
        setIsAddDialogOpen(true)
    }

    const resetForm = () => {
        setEditingConfig(null)
        setFormCoachId('')
        setFormBotId('')
        setFormBotName('')
    }

    // メッセージのハイライト処理（簡易）
    const renderHighlightedMessage = (text: string) => {
        const keywords = /(日程|調整|空き|予約|レッスン|振替|都合|曜日|時間|候補|希望|日時|\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}|\d{1,2}日|\d{1,2}時)/gi
        const parts = text.split(keywords)
        if (parts.length <= 1) return text

        return parts.map((part, i) => {
            const isMatch = keywords.test(part)
            return isMatch ? (
                <span key={i} className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                    {part}
                </span>
            ) : (
                part
            )
        })
    }

    return (
        <div className="space-y-6">
            {/* ヘッダーセクション（スタイリッシュなグラデーション背景） */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-indigo-950/10">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-6 w-6 text-indigo-400" />
                            <h1 className="text-2xl font-bold tracking-tight">LINE日程調整監視</h1>
                        </div>
                        <p className="text-slate-400 mt-1 text-sm">
                            各コーチのLINE公式アカウントにおける、日程調整メッセージの自動検知と管理を行います。
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-indigo-900/40 text-indigo-200 border border-indigo-800 hover:bg-indigo-900/60"
                            onClick={() => {
                                fetchLogs()
                                fetchConfigs()
                                toast.success('最新情報に更新しました')
                            }}
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            同期リロード
                        </Button>
                    </div>
                </div>
                {/* 装飾用のオーラバックグラウンド */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"></div>
            </div>

            {/* メインコンテンツエリア */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                    <TabsList className="bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            日程調整ログ
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Bot className="h-4 w-4 mr-2" />
                            ボット紐付け設定
                        </TabsTrigger>
                    </TabsList>
                    
                    {activeTab === 'settings' && (
                        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                            setIsAddDialogOpen(open)
                            if (!open) resetForm()
                        }}>
                            <DialogTrigger asChild>
                                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                                    <Plus className="h-4 w-4 mr-2" />
                                    ボット設定を追加
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form onSubmit={handleSaveConfig}>
                                    <DialogHeader>
                                        <DialogTitle>{editingConfig ? 'ボット設定の編集' : 'ボット設定の追加'}</DialogTitle>
                                        <DialogDescription>
                                            各コーチのアカウント宛てに来るLINE Webhookメッセージを正しく識別するための設定を行います。
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-700">担当コーチ</label>
                                            <Select value={formCoachId} onValueChange={setFormCoachId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="コーチを選択" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {coaches.map(coach => (
                                                        <SelectItem key={coach.id} value={coach.id}>
                                                            {coach.full_name} ({coach.role === 'admin' ? '管理者' : 'コーチ'})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-700">ボット表示名</label>
                                            <Input 
                                                value={formBotName} 
                                                onChange={(e) => setFormBotName(e.target.value)} 
                                                placeholder="例: 山田コーチ公式LINE" 
                                            />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-700">ボットID (または ベーシックID)</label>
                                            <Input 
                                                value={formBotId} 
                                                onChange={(e) => setFormBotId(e.target.value)} 
                                                placeholder="例: @amao_swim または U12345..." 
                                            />
                                            <p className="text-xs text-slate-400">※ベーシックID（例: @123abcde）またはLINE Developersの「ボットユーザーID（U...）」のどちらでも設定可能です。</p>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" type="button" onClick={() => setIsAddDialogOpen(false)}>
                                            キャンセル
                                        </Button>
                                        <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500">
                                            {isSaving ? '保存中...' : '保存'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* タブ1: 監視ログ */}
                <TabsContent value="logs" className="space-y-4">
                    {/* フィルタバー */}
                    <Card className="border-slate-100 shadow-sm rounded-2xl">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        コーチで絞り込み
                                    </label>
                                    <Select value={filterCoach} onValueChange={setFilterCoach}>
                                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200">
                                            <SelectValue placeholder="すべてのコーチ" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">すべてのコーチ</SelectItem>
                                            {coaches.map(coach => (
                                                <SelectItem key={coach.id} value={coach.id}>
                                                    {coach.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                        <Filter className="h-3 w-3" />
                                        ステータス
                                    </label>
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200">
                                            <SelectValue placeholder="未確認" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unread">未確認のみ</SelectItem>
                                            <SelectItem value="checked">確認済みのみ</SelectItem>
                                            <SelectItem value="all">すべて表示</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ログ一覧 */}
                    {isLoadingLogs ? (
                        <div className="flex flex-col items-center justify-center p-12 space-y-4">
                            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                            <p className="text-slate-400 text-sm">LINE日程調整ログを読み込んでいます...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <Card className="border-dashed border-slate-200 text-center p-12 rounded-2xl bg-slate-50/50">
                            <CardContent className="space-y-3">
                                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                                <CardTitle className="text-slate-500 text-base">日程調整ログが見つかりません</CardTitle>
                                <CardDescription className="text-slate-400 text-sm max-w-sm mx-auto">
                                    選択された条件に一致する日程調整のやり取り、または検知メッセージはありません。
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {logs.map((log) => {
                                const isUnread = log.status === 'unread'
                                return (
                                    <Card 
                                        key={log.id} 
                                        className={`transition-all duration-300 rounded-2xl border-l-4 shadow-sm hover:shadow-md ${
                                            isUnread 
                                                ? 'border-l-amber-500 border-amber-200/60 bg-amber-500/[0.02]' 
                                                : 'border-l-slate-300 border-slate-200 bg-white'
                                        }`}
                                    >
                                        <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                            <div className="space-y-2 flex-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge 
                                                        variant="outline" 
                                                        className={isUnread ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}
                                                    >
                                                        {isUnread ? '未確認' : '確認済み'}
                                                    </Badge>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        {new Date(log.detected_at).toLocaleString('ja-JP')}
                                                    </span>
                                                    <span className="text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 font-mono">
                                                        {log.direction === 'customer_to_coach' ? '顧客 ➔ コーチ' : 'コーチ ➔ 顧客'}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 text-sm font-semibold text-slate-700">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <span>{log.line_display_name}</span>
                                                    </div>
                                                    <ArrowRightLeft className="h-3.5 w-3.5 text-slate-300" />
                                                    <div className="flex items-center gap-1.5">
                                                        <Bot className="h-4 w-4 text-slate-400" />
                                                        <span>{log.coach_name}</span>
                                                    </div>
                                                </div>

                                                <div className="text-slate-600 text-sm bg-slate-50 border border-slate-100/60 p-3 rounded-xl mt-2 leading-relaxed font-sans whitespace-pre-wrap">
                                                    {renderHighlightedMessage(log.message_text)}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 mt-4 md:mt-0 w-full md:w-auto justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-xl border-slate-200 text-indigo-600 hover:bg-indigo-50/50 hover:text-indigo-700 hover:border-indigo-200"
                                                    onClick={() => handleOpenScheduleModal(log)}
                                                >
                                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                                    スケジュール登録
                                                </Button>
                                                <Button 
                                                    variant={isUnread ? 'default' : 'outline'} 
                                                    size="sm" 
                                                    className={`rounded-xl transition-all duration-200 ${
                                                        isUnread 
                                                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/10' 
                                                            : 'text-slate-500 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                    onClick={() => handleUpdateStatus(log.id, log.status)}
                                                >
                                                    <Check className="mr-2 h-4 w-4" />
                                                    {isUnread ? '確認済みにする' : '未確認に戻す'}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* タブ2: ボット設定 */}
                <TabsContent value="settings" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* 左：ボット設定一覧（2カラム相当） */}
                        <div className="lg:col-span-2 space-y-4">
                            {isLoadingConfigs ? (
                                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                    <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                                    <p className="text-slate-400 text-sm">LINEボット設定を読み込んでいます...</p>
                                </div>
                            ) : configs.length === 0 ? (
                                <Card className="border-dashed border-slate-200 text-center p-12 rounded-2xl bg-slate-50/50">
                                    <CardContent className="space-y-3">
                                        <Bot className="h-10 w-10 text-slate-300 mx-auto" />
                                        <CardTitle className="text-slate-500 text-base">登録されているボットはありません</CardTitle>
                                        <CardDescription className="text-slate-400 text-sm max-w-sm mx-auto">
                                            右上ボタンからコーチとボットID（destination）の紐付け設定を追加してください。
                                        </CardDescription>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead>ボット表示名</TableHead>
                                                <TableHead>担当コーチ</TableHead>
                                                <TableHead>ボットID (destination)</TableHead>
                                                <TableHead className="w-[120px] text-right">操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {configs.map((config) => (
                                                <TableRow key={config.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-semibold text-slate-700">{config.bot_name}</TableCell>
                                                    <TableCell>{config.coach_name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">{config.bot_id}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-slate-500 hover:text-indigo-600 rounded-lg"
                                                                onClick={() => startEditConfig(config)}
                                                            >
                                                                編集
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50"
                                                                onClick={() => handleDeleteConfig(config.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>
                            )}
                        </div>

                        {/* 右：マニュアルカード（1カラム相当） */}
                        <Card className="border-slate-100 shadow-md rounded-2xl bg-gradient-to-br from-indigo-50/40 to-indigo-100/20 overflow-hidden">
                            <CardHeader className="pb-3 border-b border-indigo-100/50 bg-indigo-50/50">
                                <CardTitle className="text-sm font-bold text-indigo-950 flex items-center gap-1.5">
                                    <Bot className="h-4 w-4 text-indigo-600" />
                                    ボット紐付け設定マニュアル
                                </CardTitle>
                                <CardDescription className="text-xs text-indigo-700">
                                    各コーチの公式LINEメッセージを自動検知するための連携手順です。
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4 text-slate-700 text-xs leading-relaxed">
                                <div className="space-y-2">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-1">
                                        <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">1</span>
                                        ボットID（destination）の取得
                                    </h4>
                                    <p className="text-slate-600 pl-5.5">
                                        公式LINEアカウント固有の <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">U</code> から始まる33文字のIDを取得します。
                                    </p>
                                    <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/50 ml-5.5 space-y-1.5">
                                        <p className="font-semibold text-slate-800">【方法A: LINE Developers】</p>
                                        <ol className="list-decimal pl-4 text-slate-600 space-y-0.5">
                                            <li><a href="https://developers.line.biz/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 underline">LINE Developers</a> にログイン</li>
                                            <li>対象アカウントの「Messaging API設定」タブを開く</li>
                                            <li>下部の「ボット情報」➔「ボットユーザーID」をコピー</li>
                                        </ol>
                                        <p className="font-semibold text-slate-800 mt-2">【方法B: LINE Official Account Manager】</p>
                                        <ol className="list-decimal pl-4 text-slate-600 space-y-0.5">
                                            <li><a href="https://manager.line.biz/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 underline">LINE Official Account Manager</a> にログイン</li>
                                            <li>右上の「設定」➔ 左メニューの「Messaging API」を開く</li>
                                            <li>中央の「ボット情報」➔「ボットユーザーID」をコピー</li>
                                        </ol>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-1">
                                        <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">2</span>
                                        本システムへの紐付け登録
                                    </h4>
                                    <p className="text-slate-600 pl-5.5">
                                        画面右上の「ボット設定を追加」をクリックし、担当コーチを選択、コピーした「ボットID」と「表示名」を入力して保存します。
                                    </p>
                                </div>

                                <div className="space-y-2 col-span-1">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-1">
                                        <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">3</span>
                                        LINE側のWebhook・応答設定
                                    </h4>
                                    <p className="text-slate-600 pl-5.5">
                                        LINE Official Account Managerの「応答設定」で、**「チャット」**と**「Webhook」**を必ず **「オン」** にしてください。
                                    </p>
                                    <p className="text-slate-600 pl-5.5">
                                        また、LINE Developersの「Webhook URL」に下記URLを入力し、「Verify（検証）」でSuccessになることを確認してください。
                                    </p>
                                    <div className="bg-slate-900 text-slate-200 p-2 rounded-xl font-mono text-[9px] select-all truncate ml-5.5 mt-1 border border-slate-800">
                                        https://&#123;ドメイン&#125;/api/webhooks/line
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* スケジュール簡易登録ダイアログ */}
            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleRegisterSchedule}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
                                <CalendarPlus className="h-6 w-6 text-indigo-600" />
                                スケジュールに簡易登録
                            </DialogTitle>
                            <DialogDescription>
                                LINEメッセージから日時を自動で推測しています。内容を確認・微調整して登録してください。
                            </DialogDescription>
                        </DialogHeader>

                        {isSearchingStudent ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
                                <span className="text-sm">生徒情報およびマスタデータを取得中...</span>
                            </div>
                        ) : (
                            <div className="space-y-4 py-4">
                                {/* LINE情報（参考） */}
                                {selectedLogForSchedule && (
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                                        <div className="flex items-center justify-between text-xs text-slate-400">
                                            <span>LINE送信者: {selectedLogForSchedule.line_display_name}</span>
                                            <span>担当コーチ: {selectedLogForSchedule.coach_name}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 italic font-mono bg-white p-2 rounded border border-slate-100 truncate">
                                            「{selectedLogForSchedule.message_text}」
                                        </p>
                                    </div>
                                )}

                                {/* 生徒の選択 */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-slate-700">生徒名 *</Label>
                                    
                                    {/* 曖昧一致する候補が見つかった場合のヒント */}
                                    {studentCandidates.length > 0 && !scheduleStudentId && (
                                        <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl space-y-2">
                                            <p className="text-xs text-indigo-800 font-medium">
                                                LINE名に近い生徒の候補が見つかりました：
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {studentCandidates.map((c) => (
                                                    <Button
                                                        key={c.id}
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        className="text-xs bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                                        onClick={() => {
                                                            setScheduleStudentId(c.id)
                                                            setScheduleTitle(`レッスン (${c.full_name})`)
                                                        }}
                                                    >
                                                        {c.full_name}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Select value={scheduleStudentId} onValueChange={(val) => {
                                        setScheduleStudentId(val)
                                        const stu = allStudents.find(s => s.id === val)
                                        if (stu) {
                                            setScheduleTitle(`レッスン (${stu.full_name})`)
                                        }
                                    }}>
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue placeholder="生徒を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allStudents.map(student => (
                                                <SelectItem key={student.id} value={student.id}>
                                                    {student.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* レッスン種別の選択 */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-slate-700">レッスン種別 *</Label>
                                    <Select value={scheduleLessonMasterId} onValueChange={setScheduleLessonMasterId}>
                                        <SelectTrigger className="rounded-xl border-slate-200">
                                            <SelectValue placeholder="レッスン種別を選択" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {lessonMasters.map(master => (
                                                <SelectItem key={master.id} value={master.id}>
                                                    {master.name} (¥{master.price.toLocaleString()})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* スケジュールタイトル */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-slate-700">スケジュール名 *</Label>
                                    <Input
                                        value={scheduleTitle}
                                        onChange={(e) => setScheduleTitle(e.target.value)}
                                        placeholder="例: レッスン"
                                        className="rounded-xl border-slate-200"
                                        required
                                    />
                                </div>

                                {/* 日時 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-semibold text-slate-700">開始日時 *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={scheduleStartTime}
                                            onChange={(e) => setScheduleStartTime(e.target.value)}
                                            className="rounded-xl border-slate-200"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label className="text-sm font-semibold text-slate-700">終了日時 *</Label>
                                        <Input
                                            type="datetime-local"
                                            value={scheduleEndTime}
                                            onChange={(e) => setScheduleEndTime(e.target.value)}
                                            className="rounded-xl border-slate-200"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* 場所 */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-slate-700">場所</Label>
                                    <Input
                                        value={scheduleLocation}
                                        onChange={(e) => setScheduleLocation(e.target.value)}
                                        placeholder="例: ○○温水プール"
                                        className="rounded-xl border-slate-200"
                                    />
                                </div>

                                {/* メモ */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-slate-700">メモ</Label>
                                    <textarea
                                        value={scheduleNotes}
                                        onChange={(e) => setScheduleNotes(e.target.value)}
                                        className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="特記事項があれば入力してください"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2 pt-4 border-t border-slate-100">
                            <Button 
                                variant="outline" 
                                type="button" 
                                className="rounded-xl"
                                onClick={() => setIsScheduleDialogOpen(false)}
                            >
                                キャンセル
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isRegisteringSchedule || isSearchingStudent} 
                                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                            >
                                {isRegisteringSchedule ? '登録中...' : 'スケジュールに登録'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
