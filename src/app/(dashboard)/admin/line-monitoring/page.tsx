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
    executeLessonReminderCronAction,
    getScheduleMonitoringWebhookAction,
    saveScheduleMonitoringWebhookAction,
    testScheduleMonitoringWebhookAction,
    verifyCoachLineTokenAction,
    getOfficialLineStepLeadsAction,
    updateStepLeadStatusAction,
    triggerStepRemindersNowAction,
    getStepTemplatesAction,
    saveStepTemplatesAction,
    LineMonitoringLog,
    LineBotConfig
} from '@/actions/line-monitoring'
import { getChatWebhooksAction, ChatWebhook } from '@/actions/gchat_webhook'
import { createLessonSchedule } from '@/actions/lesson_schedule'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import Link from 'next/link'
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
    CalendarPlus,
    Send,
    ExternalLink,
    KeyRound,
    Loader2,
    ShieldCheck,
    Save
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
    const [formGChatWebhookId, setFormGChatWebhookId] = useState('')
    const [formChannelAccessToken, setFormChannelAccessToken] = useState('')
    const [isVerifyingFormToken, setIsVerifyingFormToken] = useState(false)
    const [chatWebhooks, setChatWebhooks] = useState<ChatWebhook[]>([])

    // 管理者用 Google Chat Webhook 状態（日程調整検知 集約用）
    const [adminWebhookUrl, setAdminWebhookUrl] = useState('')
    const [adminWebhookEnabled, setAdminWebhookEnabled] = useState(true)
    const [selectedAdminWebhookId, setSelectedAdminWebhookId] = useState('none')
    const [isSavingAdminWebhook, setIsSavingAdminWebhook] = useState(false)
    const [isTestingAdminWebhook, setIsTestingAdminWebhook] = useState(false)

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
    const [allStudents, setAllStudents] = useState<{ id: string; full_name: string; coach_id?: string | null; status?: string | null }[]>([])
    const [studentCandidates, setStudentCandidates] = useState<{ id: string; full_name: string; line_user_id: string | null }[]>([])
    const [isSearchingStudent, setIsSearchingStudent] = useState(false)
    const [isRegisteringSchedule, setIsRegisteringSchedule] = useState(false)
    const [onlyAssignedCoachStudents, setOnlyAssignedCoachStudents] = useState(false)
    const [isTriggeringReminder, setIsTriggeringReminder] = useState(false)

    // 事務局公式LINEステップ配信状態
    const [stepLeads, setStepLeads] = useState<any[]>([])
    const [isLoadingStepLeads, setIsLoadingStepLeads] = useState(false)
    const [isTriggeringStepReminder, setIsTriggeringStepReminder] = useState(false)
    const [stepLeadFilter, setStepLeadFilter] = useState<'all' | 'friend_only' | 'inquired' | 'applied' | 'trial_done' | 'active' | 'withdrawn'>('all')

    // 事務局公式LINEステップ配信メッセージテンプレート設定
    const [stepTemplates, setStepTemplates] = useState<{
        step1: { title: string; delay_hours: number; body: string; is_active: boolean };
        step2: { title: string; delay_hours: number; body: string; is_active: boolean };
        step3: { title: string; delay_hours: number; body: string; is_active: boolean };
    } | null>(null)
    const [defaultTemplates, setDefaultTemplates] = useState<any>(null)
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)
    const [isSavingTemplates, setIsSavingTemplates] = useState(false)
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false)
    const [activeTemplateTab, setActiveTemplateTab] = useState<'step1' | 'step2' | 'step3'>('step1')

    // 時間の自動計算（レッスン種別の分数に基づく）
    const calculateEndTime = (startStr: string, masterId: string, mastersList = lessonMasters) => {
        if (!startStr) return ''
        const master = mastersList.find(m => m.id === masterId)
        let durationMinutes = 60
        if (master) {
            if (master.name.includes('120分') || master.name.includes('120')) durationMinutes = 120
            else if (master.name.includes('90分') || master.name.includes('90')) durationMinutes = 90
            else if (master.name.includes('30分') || master.name.includes('30')) durationMinutes = 30
            else if (master.name.includes('60分') || master.name.includes('60')) durationMinutes = 60
        }

        const d = new Date(startStr)
        if (isNaN(d.getTime())) return ''
        d.setMinutes(d.getMinutes() + durationMinutes)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    // 開始日時変更時の連動
    const handleStartTimeChange = (newStart: string) => {
        setScheduleStartTime(newStart)
        if (scheduleLessonMasterId) {
            setScheduleEndTime(calculateEndTime(newStart, scheduleLessonMasterId))
        }
    }

    // レッスン種別変更時の連動
    const handleLessonMasterChange = (newMasterId: string) => {
        setScheduleLessonMasterId(newMasterId)
        if (scheduleStartTime) {
            setScheduleEndTime(calculateEndTime(scheduleStartTime, newMasterId))
        }
    }

    // 前日リマインド手動実行（テスト太郎様対象）
    const handleTriggerReminder = async () => {
        if (!confirm('明日のレッスン予定（テスト太郎 様）について、前日リマインド（公式LINE/メール/担当コーチGoogle Chat）を送信テストしますか？\n\n※安全ガードにより、テスト太郎 様以外の他のお客様へは送信されません。')) {
            return
        }

        setIsTriggeringReminder(true)
        try {
            // dry_run=false で実際に送信（他顧客は安全ガードでスキップ）
            const res = await executeLessonReminderCronAction({ dryRun: false })
            if (res.success) {
                const count = ('processed' in res ? res.processed : 0) || 0
                if (count === 0) {
                    toast.info('明日予定されている未送信のリマインド対象レッスンはありませんでした。')
                } else {
                    toast.success(`明日のレッスン ${count}件 の前日連絡を送信完了しました。`)
                }
            } else {
                toast.error('前日連絡の実行に失敗しました: ' + (res.error || '不明なエラー'))
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message)
        } finally {
            setIsTriggeringReminder(false)
        }
    }

    // 初期フェッチ
    useEffect(() => {
        fetchCoaches()
        fetchLogs()
        fetchConfigs()
        fetchChatWebhooks()
        fetchAdminWebhook()
        fetchStepLeads()
        fetchTemplates()
    }, [])

    // 事務局公式LINEステップ配信リード取得
    const fetchStepLeads = async () => {
        setIsLoadingStepLeads(true)
        try {
            const res = await getOfficialLineStepLeadsAction()
            if (res.success && res.data) {
                setStepLeads(res.data)
            }
        } catch (e: any) {
            console.error('Failed to fetch step leads:', e)
        } finally {
            setIsLoadingStepLeads(false)
        }
    }

    // ステップ配信メッセージテンプレート取得
    const fetchTemplates = async () => {
        setIsLoadingTemplates(true)
        try {
            const res = await getStepTemplatesAction()
            if (res.success && res.data) {
                setStepTemplates(res.data)
                if (res.defaultTemplates) {
                    setDefaultTemplates(res.defaultTemplates)
                }
            }
        } catch (e: any) {
            console.error('Failed to fetch step templates:', e)
        } finally {
            setIsLoadingTemplates(false)
        }
    }

    // ステップ配信メッセージテンプレート保存
    const handleSaveTemplates = async () => {
        if (!stepTemplates) return
        setIsSavingTemplates(true)
        try {
            const res = await saveStepTemplatesAction(stepTemplates)
            if (res.success) {
                toast.success('ステップ配信テンプレート設定を保存しました')
            } else {
                toast.error('保存に失敗しました: ' + res.error)
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message)
        } finally {
            setIsSavingTemplates(false)
        }
    }

    // 初期設定テンプレートへリセット
    const handleResetTemplates = () => {
        if (defaultTemplates) {
            if (confirm('テンプレートを初期設定の内容に戻しますか？\n（※「設定を保存」ボタンを押すまで確定されません）')) {
                setStepTemplates(JSON.parse(JSON.stringify(defaultTemplates)))
                toast.info('初期テンプレートを反映しました。「設定を保存」を押して確定してください')
            }
        }
    }

    // 変数タグの挿入
    const handleInsertVariable = (stepKey: 'step1' | 'step2' | 'step3', variable: string) => {
        if (!stepTemplates) return
        const current = stepTemplates[stepKey].body || ''
        setStepTemplates({
            ...stepTemplates,
            [stepKey]: {
                ...stepTemplates[stepKey],
                body: current + (current.endsWith('\n') || current === '' ? '' : '\n') + variable
            }
        })
        toast.info(`${variable} を挿入しました`)
    }


    // ステップ配信ステータス更新
    const handleUpdateStepLeadStatus = async (lineUserId: string, newStatus: string, stopDelivery: boolean = false) => {
        try {
            const res = await updateStepLeadStatusAction(lineUserId, newStatus, stopDelivery)
            if (res.success) {
                toast.success('ステータスを更新しました')
                fetchStepLeads()
            } else {
                toast.error('更新に失敗しました: ' + res.error)
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message)
        }
    }

    // ステップ配信手動即時実行（テストまたは本番）
    const handleTriggerStepReminders = async (dryRun: boolean = false) => {
        setIsTriggeringStepReminder(true)
        try {
            const res = await triggerStepRemindersNowAction(dryRun)
            if (res.success) {
                const count = 'processedCount' in res ? (res.processedCount || 0) : 0
                if (dryRun) {
                    toast.info(`【テスト確認】送信対象リード: ${count}件`)
                } else {
                    toast.success(`ステップ配信を実行しました（送信対象: ${count}件）`)
                }
                fetchStepLeads()
            } else {
                toast.error('ステップ配信の実行に失敗しました: ' + res.error)
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message)
        } finally {
            setIsTriggeringStepReminder(false)
        }
    }

    // Webhookリスト読み込み後のセレクトボックス自動同期
    useEffect(() => {
        if (adminWebhookUrl && chatWebhooks.length > 0) {
            const matched = chatWebhooks.find(w => w.webhook_url === adminWebhookUrl)
            if (matched) {
                setSelectedAdminWebhookId(matched.id)
            } else {
                setSelectedAdminWebhookId('custom')
            }
        }
    }, [adminWebhookUrl, chatWebhooks])

    // 管理者専用Webhook取得
    const fetchAdminWebhook = async () => {
        const res = await getScheduleMonitoringWebhookAction()
        if (res.success && res.data) {
            setAdminWebhookUrl(res.data.webhook_url)
            setAdminWebhookEnabled(res.data.enabled)
        }
    }

    // 管理者専用Webhook保存
    const handleSaveAdminWebhook = async () => {
        setIsSavingAdminWebhook(true)
        try {
            const res = await saveScheduleMonitoringWebhookAction({
                webhook_url: adminWebhookUrl,
                enabled: adminWebhookEnabled
            })
            if (res.success) {
                toast.success('管理者用 Google Chat 通知先を保存しました')
            } else {
                toast.error('保存に失敗しました: ' + res.error)
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message)
        } finally {
            setIsSavingAdminWebhook(false)
        }
    }

    // 管理者専用Webhookテスト送信
    const handleTestAdminWebhook = async () => {
        if (!adminWebhookUrl.trim()) {
            toast.error('Webhook URLを入力または選択してください')
            return
        }
        setIsTestingAdminWebhook(true)
        try {
            const res = await testScheduleMonitoringWebhookAction(adminWebhookUrl)
            if (res.success) {
                toast.success('Google Chatスペースへテスト送信しました')
            } else {
                toast.error('テスト送信失敗: ' + res.error)
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + e.message)
        } finally {
            setIsTestingAdminWebhook(false)
        }
    }

    // 登録済みスペース選択時の変更
    const handleSelectAdminSpace = (val: string) => {
        setSelectedAdminWebhookId(val)
        if (val === 'none') {
            setAdminWebhookUrl('')
        } else if (val !== 'custom') {
            const webhook = chatWebhooks.find(w => w.id === val)
            if (webhook) {
                setAdminWebhookUrl(webhook.webhook_url)
            }
        }
    }

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

    // Google Chat Webhook 一覧取得
    const fetchChatWebhooks = async () => {
        const res = await getChatWebhooksAction()
        if (res.success) {
            setChatWebhooks((res.data || []).filter(w => w.active))
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

    // ステータス更新処理 (0秒即時反映)
    const handleUpdateStatus = async (logId: string, currentStatus: 'unread' | 'checked') => {
        const nextStatus = currentStatus === 'unread' ? 'checked' : 'unread'
        
        // 1. 0秒で画面を即時更新（リロードなしで瞬時に反映）
        setLogs(prev => prev.map(log => log.id === logId ? { ...log, status: nextStatus } : log))
        toast.success(nextStatus === 'checked' ? 'ログを確認済みにしました' : 'ログを未確認に戻しました')

        // 2. バックグラウンドで非同期送信
        const res = await updateLogStatusAction(logId, nextStatus)
        if (!res.success) {
            // エラー時は元のステータスにロールバック
            setLogs(prev => prev.map(log => log.id === logId ? { ...log, status: currentStatus } : log))
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
        setOnlyAssignedCoachStudents(false)
        
        // 1. 日付の簡易パース
        let initialStart = ''
        let initialEnd = ''
        const parsed = parseDateTimeFromMessage(log.message_text)
        if (parsed) {
            initialStart = parsed.start
            initialEnd = parsed.end
        } else {
            // パースできない場合は明日の午前10時〜11時をデフォルトに
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const pad = (n: number) => String(n).padStart(2, '0')
            initialStart = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`
            initialEnd = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T11:00`
        }

        setScheduleStartTime(initialStart)
        setScheduleEndTime(initialEnd)
        setIsScheduleDialogOpen(true)
        setIsSearchingStudent(true)

        // 2. 生徒の特定・マスタデータのフェッチ
        try {
            const [studentRes, mastersRes, studentsListRes] = await Promise.all([
                findStudentByLineInfoAction(log.line_user_id, log.line_display_name),
                getLessonMastersListAction(),
                getStudentsSimpleListAction()
            ])

            let currentMasterId = ''
            if (mastersRes.success && mastersRes.data && mastersRes.data.length > 0) {
                setLessonMasters(mastersRes.data)
                // 通常レッスン（非体験）を優先してデフォルト選択
                const defaultMaster = mastersRes.data.find(m => !m.is_trial) || mastersRes.data[0]
                if (defaultMaster) {
                    currentMasterId = defaultMaster.id
                    setScheduleLessonMasterId(defaultMaster.id)
                    // レッスン種別の分数から終了時間を自動計算
                    const autoEnd = calculateEndTime(initialStart, defaultMaster.id, mastersRes.data)
                    if (autoEnd) {
                        setScheduleEndTime(autoEnd)
                    }
                }
            }

            if (studentsListRes.success) {
                setAllStudents(studentsListRes.data || [])
            }

            if (studentRes.success) {
                if (studentRes.match) {
                    setScheduleStudentId(studentRes.match.id)
                    setScheduleTitle(`レッスン (${studentRes.match.full_name})`)
                } else if (studentRes.candidates && studentRes.candidates.length > 0) {
                    setStudentCandidates(studentRes.candidates)
                }
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
                
                // 監視ログのステータスを自動的に確認済にし、ローカルステートも即時反映
                if (selectedLogForSchedule.status === 'unread') {
                    setLogs(prev => prev.map(log => log.id === selectedLogForSchedule.id ? { ...log, status: 'checked' } : log))
                    await updateLogStatusAction(selectedLogForSchedule.id, 'checked')
                }

                setIsScheduleDialogOpen(false)
                fetchLogs() // バックグラウンドで最新データを取得
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
            toast.error('必須項目（担当コーチ、ボット表示名、ボットID）を入力してください')
            return
        }

        setIsSaving(true)
        try {
            // チャネルアクセストークンが入力されている場合は自動でAPI検証
            if (formChannelAccessToken.trim()) {
                const tokenRes = await verifyCoachLineTokenAction(formChannelAccessToken.trim())
                if (!tokenRes.success) {
                    throw new Error(tokenRes.error || 'LINEトークンの検証に失敗しました')
                }
            }

            const res = await saveLineBotConfigAction({
                id: editingConfig?.id,
                coach_id: formCoachId,
                bot_id: formBotId.trim(),
                bot_name: formBotName.trim(),
                gchat_webhook_id: formGChatWebhookId === 'none' ? null : (formGChatWebhookId || null),
                channel_access_token: formChannelAccessToken.trim() || null
            })

            if (res.success) {
                toast.success(editingConfig ? 'ボットの紐付け設定を更新しました' : 'ボットの紐付け設定を登録しました')
                setIsAddDialogOpen(false)
                resetForm()
                fetchConfigs()
            } else {
                toast.error('設定の保存に失敗しました: ' + res.error)
            }
        } catch (err: any) {
            toast.error(err.message || '保存に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }

    // LINEアクセストークン接続テスト
    const handleVerifyFormToken = async () => {
        if (!formChannelAccessToken.trim()) {
            toast.error('チャネルアクセストークンを入力してください')
            return
        }
        setIsVerifyingFormToken(true)
        try {
            const res = await verifyCoachLineTokenAction(formChannelAccessToken.trim())
            if (res.success && res.botInfo) {
                if (!formBotName && res.botInfo.displayName) setFormBotName(res.botInfo.displayName)
                if (!formBotId && res.botInfo.basicId) setFormBotId(res.botInfo.basicId)
                toast.success(`LINE接続確認OK: ${res.botInfo.displayName} (${res.botInfo.basicId || ''})`)
            } else {
                toast.error(res.error || 'LINEトークンの検証に失敗しました')
            }
        } catch (e: any) {
            toast.error('エラーが発生しました: ' + (e.message || ''))
        } finally {
            setIsVerifyingFormToken(false)
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

    const startEditConfig = (config: any) => {
        setEditingConfig(config)
        setFormCoachId(config.coach_id)
        setFormBotId(config.bot_id)
        setFormBotName(config.bot_name)
        setFormGChatWebhookId(config.gchat_webhook_id || 'none')
        setFormChannelAccessToken(config.channel_access_token || '')
        setIsAddDialogOpen(true)
    }

    const resetForm = () => {
        setEditingConfig(null)
        setFormCoachId('')
        setFormBotId('')
        setFormBotName('')
        setFormGChatWebhookId('')
        setFormChannelAccessToken('')
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
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            disabled={isTriggeringReminder}
                            className="bg-indigo-900/40 text-indigo-200 border border-indigo-800 hover:bg-indigo-900/60"
                            onClick={() => handleTriggerReminder()}
                        >
                            <Send className="mr-2 h-4 w-4 text-indigo-400" />
                            {isTriggeringReminder ? '処理中...' : '明日の前日連絡テスト実行'}
                        </Button>
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

            {/* 管理者用 Google Chat 通知先設定（公式ラインチャットグループ） */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-indigo-600" />
                            管理者用 Google Chat 通知先設定（公式ラインチャットグループ）
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-0.5">
                            見込み客からの公式LINEチャット相談や、各コーチのLINEでの日程調整が検知された際、この公式ラインチャットグループへ自動通知が集約されます。
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="admin-webhook-switch" className="text-xs text-slate-600 cursor-pointer">
                            {adminWebhookEnabled ? '通知 ON' : '通知 OFF'}
                        </Label>
                        <Switch
                            id="admin-webhook-switch"
                            checked={adminWebhookEnabled}
                            onCheckedChange={setAdminWebhookEnabled}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600">登録済みスペースから選択</Label>
                            <Select value={selectedAdminWebhookId} onValueChange={handleSelectAdminSpace}>
                                <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                                    <SelectValue placeholder="スペースを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">指定なし（未設定）</SelectItem>
                                    {selectedAdminWebhookId === 'custom' && (
                                        <SelectItem value="custom">直接入力されたURL</SelectItem>
                                    )}
                                    {chatWebhooks.map(webhook => (
                                        <SelectItem key={webhook.id} value={webhook.id}>
                                            {webhook.space_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs text-slate-600">Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="url"
                                    value={adminWebhookUrl}
                                    onChange={e => {
                                        setAdminWebhookUrl(e.target.value)
                                        setSelectedAdminWebhookId('custom')
                                    }}
                                    placeholder="https://chat.googleapis.com/v1/spaces/..."
                                    className="h-8 text-xs font-mono bg-white border-slate-200 flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestAdminWebhook}
                                    disabled={isTestingAdminWebhook || !adminWebhookUrl.trim()}
                                    className="h-8 text-xs gap-1 flex-none"
                                >
                                    {isTestingAdminWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    テスト送信
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleSaveAdminWebhook}
                                    disabled={isSavingAdminWebhook}
                                    className="h-8 text-xs gap-1 bg-slate-900 hover:bg-slate-800 text-white flex-none"
                                >
                                    {isSavingAdminWebhook ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                    保存
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* メインコンテンツエリア */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex justify-between items-center border-b pb-2">
                    <TabsList className="bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <MessageSquare className="h-4 w-4 mr-2" />
                            日程調整ログ
                        </TabsTrigger>
                        <TabsTrigger value="step-reminders" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Send className="h-4 w-4 mr-2 text-indigo-600" />
                            公式LINEステップ配信
                            {stepLeads.filter(l => l.status === 'friend_only').length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                                    {stepLeads.filter(l => l.status === 'friend_only').length}
                                </span>
                            )}
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
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-700">チャネルアクセストークン（長期）</label>
                                            <div className="flex gap-2">
                                                <Input 
                                                    type="password"
                                                    value={formChannelAccessToken} 
                                                    onChange={(e) => setFormChannelAccessToken(e.target.value)} 
                                                    placeholder="LINE Developersの長期トークン"
                                                    className="font-mono text-xs flex-1"
                                                />
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={handleVerifyFormToken}
                                                    disabled={isVerifyingFormToken || !formChannelAccessToken.trim()}
                                                    className="h-9 text-xs flex-none"
                                                >
                                                    {isVerifyingFormToken ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '接続確認'}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-slate-400">※前日連絡を生徒に公式LINEプッシュ送信するために使用します。</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-medium text-slate-700">通知先 Google Chat スペース（前日リマインド用）</label>
                                            <Select value={formGChatWebhookId} onValueChange={setFormGChatWebhookId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="通知先のスペースを選択 (指定なしの場合は既定の1件)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">指定なし (未設定)</SelectItem>
                                                    {chatWebhooks.map(webhook => (
                                                        <SelectItem key={webhook.id} value={webhook.id}>
                                                            {webhook.space_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-slate-400">※前日のレッスン予定通知を受信するコーチ専用のGoogle Chatスペースを選択します。</p>
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
                    {/* 一元管理案内バナー */}
                    <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-indigo-950">
                        <div className="flex items-center gap-2.5">
                            <KeyRound className="h-5 w-5 text-indigo-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-indigo-900">各コーチのLINE・通知設定は「コーチ詳細画面」から一元管理できます</h4>
                                <p className="text-xs text-indigo-700/80 mt-0.5">
                                    LINE友達追加URL、公式LINEボットID、前日自動送信用アクセストークン、連絡先Google Chatスペースをコーチごとに設定可能です。
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" asChild className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm shrink-0 rounded-xl">
                            <Link href="/admin/coaches">
                                <ExternalLink className="h-4 w-4 mr-1.5" />
                                コーチ一覧を開く
                            </Link>
                        </Button>
                    </div>

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
                                            各コーチの詳細画面（LINE設定）または右上ボタンから設定を追加してください。
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
                                                <TableHead>ボットID (または ベーシックID)</TableHead>
                                                <TableHead>通知スペース</TableHead>
                                                <TableHead className="w-[140px] text-right">操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {configs.map((config: any) => (
                                                <TableRow key={config.id} className="hover:bg-slate-50/50">
                                                    <TableCell className="font-semibold text-slate-700">{config.bot_name}</TableCell>
                                                    <TableCell>{config.coach_name}</TableCell>
                                                    <TableCell className="font-mono text-xs text-slate-500">{config.bot_id}</TableCell>
                                                    <TableCell className="text-xs text-indigo-700 font-medium">
                                                        {config.space_name ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-medium">
                                                                {config.space_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">既定</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                asChild
                                                                className="text-slate-500 hover:text-indigo-600 rounded-lg px-2"
                                                                title="コーチ詳細画面を開く"
                                                            >
                                                                <Link href={`/admin/coaches/${config.coach_id}`}>
                                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                                </Link>
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-slate-500 hover:text-indigo-600 rounded-lg px-2 text-xs"
                                                                onClick={() => startEditConfig(config)}
                                                            >
                                                                編集
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 px-2"
                                                                onClick={() => handleDeleteConfig(config.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
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

                {/* タブ3: 事務局公式LINE 未申込ステップ配信 */}
                <TabsContent value="step-reminders" className="space-y-6">
                    {/* 上部説明 ＆ アクションバナー */}
                    <div className="bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-indigo-50/90 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                                    <Send className="h-3 w-3" />
                                    事務局公式LINE代表アカウント（@607ekntf）
                                </span>
                                <Badge variant="outline" className="bg-white text-slate-600 border-indigo-200 text-xs">
                                    毎時Cron自動判定
                                </Badge>
                            </div>
                            <h3 className="text-base font-bold text-slate-800">友だち追加未申込ユーザー向け 自動ステップ配信</h3>
                            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                                公式LINEを友だち追加したものの、申し込みがないリードに対し、24時間後（Step 1: 出張公営プール案内）、72時間後（Step 2: お悩み・上達安心感）、120時間後（Step 3: チャット直接相談）を順次自動配信します。<br />
                                <span className="text-indigo-700 font-semibold">※体験申込フォーム送信時、またはチャットで返信があった瞬間にステップ配信は即座に自動停止します。</span>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTriggerStepReminders(true)}
                                disabled={isTriggeringStepReminder}
                                className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs h-9"
                            >
                                {isTriggeringStepReminder ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                                対象者テスト確認
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleTriggerStepReminders(false)}
                                disabled={isTriggeringStepReminder}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/20 rounded-xl text-xs h-9"
                            >
                                {isTriggeringStepReminder ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                                今すぐ配信を実行
                            </Button>
                        </div>
                    </div>

                    {/* 配信メッセージ文面エディタ */}
                    <Card className="border-indigo-100 shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/80 pb-3 border-b border-slate-100">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4 text-indigo-600" />
                                        <CardTitle className="text-sm font-bold text-slate-800">ステップ配信メッセージ文面設定</CardTitle>
                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                                            自由編集・即時反映
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs text-slate-500">
                                        友だち追加後の経過時間（24h / 72h / 120h）ごとに送信されるLINEメッセージ文面や配信間隔を管理画面から編集できます。
                                    </CardDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsTemplateEditorOpen(!isTemplateEditorOpen)}
                                    className="text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 self-start sm:self-auto"
                                >
                                    {isTemplateEditorOpen ? 'エディタを閉じる' : 'メッセージ文面を編集する'}
                                </Button>
                            </div>
                        </CardHeader>
                        {isTemplateEditorOpen && (
                            <CardContent className="p-5 space-y-4">
                                {isLoadingTemplates ? (
                                    <div className="flex items-center justify-center py-8 text-slate-400 text-xs">
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        テンプレートを読み込み中...
                                    </div>
                                ) : !stepTemplates ? (
                                    <div className="text-center py-6 text-slate-500 text-xs">
                                        テンプレートの読み込みに失敗しました。
                                        <Button variant="link" size="sm" onClick={fetchTemplates} className="text-xs text-indigo-600">
                                            再試行
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Step1 / Step2 / Step3 切り替えサブタブ ＆ 保存ボタン */}
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {(['step1', 'step2', 'step3'] as const).map((key, idx) => {
                                                    const stepNum = idx + 1
                                                    const hours = stepTemplates[key].delay_hours
                                                    const isActive = stepTemplates[key].is_active
                                                    const isSelected = activeTemplateTab === key
                                                    return (
                                                        <button
                                                            key={key}
                                                            type="button"
                                                            onClick={() => setActiveTemplateTab(key)}
                                                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border ${
                                                                isSelected 
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            <span>Step {stepNum} ({hours}h後)</span>
                                                            <span className={`w-2 h-2 rounded-full ${isActive ? (isSelected ? 'bg-emerald-300' : 'bg-emerald-500') : 'bg-slate-300'}`} />
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleResetTemplates}
                                                    className="text-xs h-8 text-slate-500 hover:text-slate-700"
                                                >
                                                    初期設定に戻す
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveTemplates}
                                                    disabled={isSavingTemplates}
                                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 shadow-sm rounded-xl px-4"
                                                >
                                                    {isSavingTemplates ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                                    設定を保存
                                                </Button>
                                            </div>
                                        </div>

                                        {/* 選択中ステップの編集フォーム */}
                                        {stepTemplates[activeTemplateTab] && (
                                            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                                                    <div className="md:col-span-6 space-y-1">
                                                        <Label className="text-xs font-bold text-slate-700">ステップ管理タイトル</Label>
                                                        <Input
                                                            value={stepTemplates[activeTemplateTab].title}
                                                            onChange={(e) => {
                                                                setStepTemplates({
                                                                    ...stepTemplates,
                                                                    [activeTemplateTab]: {
                                                                        ...stepTemplates[activeTemplateTab],
                                                                        title: e.target.value
                                                                    }
                                                                })
                                                            }}
                                                            placeholder="配信ステップの管理用タイトル"
                                                            className="text-xs h-9 bg-white"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1">
                                                        <Label className="text-xs font-bold text-slate-700">配信間隔（友だち追加から）</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="number"
                                                                value={stepTemplates[activeTemplateTab].delay_hours}
                                                                onChange={(e) => {
                                                                    setStepTemplates({
                                                                        ...stepTemplates,
                                                                        [activeTemplateTab]: {
                                                                            ...stepTemplates[activeTemplateTab],
                                                                            delay_hours: parseInt(e.target.value) || 0
                                                                        }
                                                                    })
                                                                }}
                                                                className="text-xs h-9 bg-white w-24"
                                                            />
                                                            <span className="text-xs text-slate-600 font-medium">時間後</span>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-3 space-y-1 flex flex-col justify-end">
                                                        <Label className="text-xs font-bold text-slate-700 mb-2">配信ステータス</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={stepTemplates[activeTemplateTab].is_active}
                                                                onCheckedChange={(checked) => {
                                                                    setStepTemplates({
                                                                        ...stepTemplates,
                                                                        [activeTemplateTab]: {
                                                                            ...stepTemplates[activeTemplateTab],
                                                                            is_active: checked
                                                                        }
                                                                    })
                                                                }}
                                                                id={`active-${activeTemplateTab}`}
                                                            />
                                                            <Label htmlFor={`active-${activeTemplateTab}`} className="text-xs text-slate-700 cursor-pointer font-medium">
                                                                {stepTemplates[activeTemplateTab].is_active ? (
                                                                    <span className="text-emerald-600 font-bold">配信中（有効）</span>
                                                                ) : (
                                                                    <span className="text-slate-400 font-medium">スキップ（停止中）</span>
                                                                )}
                                                            </Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 pt-2">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <Label className="text-xs font-bold text-slate-700">メッセージ本文（LINE送信内容）</Label>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[11px] text-slate-500 mr-1">差し込み変数:</span>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleInsertVariable(activeTemplateTab, '{name}')}
                                                                className="h-6 text-[11px] px-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 border-slate-300 rounded-lg"
                                                            >
                                                                + {'{name}'}（顧客名）
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleInsertVariable(activeTemplateTab, '{trial_url}')}
                                                                className="h-6 text-[11px] px-2.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 border-slate-300 rounded-lg"
                                                            >
                                                                + {'{trial_url}'}（体験申込URL）
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <Textarea
                                                        rows={9}
                                                        value={stepTemplates[activeTemplateTab].body}
                                                        onChange={(e) => {
                                                            setStepTemplates({
                                                                ...stepTemplates,
                                                                [activeTemplateTab]: {
                                                                    ...stepTemplates[activeTemplateTab],
                                                                    body: e.target.value
                                                                }
                                                            })
                                                        }}
                                                        className="text-xs font-mono bg-white resize-y leading-relaxed border-slate-200"
                                                        placeholder="LINEで送信するメッセージ本文を入力してください..."
                                                    />
                                                    <p className="text-[11px] text-slate-400 leading-tight">
                                                        ※ <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">{'{name}'}</code> はLINE登録時の表示名（または「お客様」）に、
                                                        <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">{'{trial_url}'}</code> は体験レッスン申込ページのURLに自動置換されます。
                                                    </p>

                                                    {/* 置換プレビュー表示 */}
                                                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                                                <MessageSquare className="h-3 w-3 text-indigo-500" />
                                                                送信プレビュー（変数置換後イメージ: テスト太郎 様）:
                                                            </span>
                                                            <span className="text-[10px] text-slate-400">※実際の送信時は顧客ごとのLINE表示名が自動置換されます</span>
                                                        </div>
                                                        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
                                                            {(stepTemplates[activeTemplateTab].body || '')
                                                                .replace(/[{｛]{1,2}\s*name\s*[}｝]{1,2}/gi, 'テスト太郎')
                                                                .replace(/[{｛]{1,2}\s*trial_url\s*[}｝]{1,2}/gi, 'https://manager.swim-partners.com/trial')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* ステータスフィルターボタン */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant={stepLeadFilter === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('all')}
                            className="rounded-xl text-xs h-8"
                        >
                            すべて ({stepLeads.length})
                        </Button>
                        <Button
                            variant={stepLeadFilter === 'friend_only' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('friend_only')}
                            className={`rounded-xl text-xs h-8 ${stepLeadFilter === 'friend_only' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'text-amber-700 border-amber-200 bg-amber-50/50'}`}
                        >
                            友だち追加のみ・配信中 ({stepLeads.filter(l => l.status === 'friend_only').length})
                        </Button>
                        <Button
                            variant={stepLeadFilter === 'inquired' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('inquired')}
                            className={`rounded-xl text-xs h-8 ${stepLeadFilter === 'inquired' ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'text-sky-700 border-sky-200 bg-sky-50/50'}`}
                        >
                            問い合わせ・相談中 ({stepLeads.filter(l => l.status === 'inquired').length})
                        </Button>
                        <Button
                            variant={stepLeadFilter === 'applied' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('applied')}
                            className={`rounded-xl text-xs h-8 ${stepLeadFilter === 'applied' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'text-blue-700 border-blue-200 bg-blue-50/50'}`}
                        >
                            申し込み済み ({stepLeads.filter(l => l.status === 'applied').length})
                        </Button>
                        <Button
                            variant={stepLeadFilter === 'trial_done' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('trial_done')}
                            className={`rounded-xl text-xs h-8 ${stepLeadFilter === 'trial_done' ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'text-purple-700 border-purple-200 bg-purple-50/50'}`}
                        >
                            体験済み ({stepLeads.filter(l => l.status === 'trial_done').length})
                        </Button>
                        <Button
                            variant={stepLeadFilter === 'active' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('active')}
                            className={`rounded-xl text-xs h-8 ${stepLeadFilter === 'active' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'text-emerald-700 border-emerald-200 bg-emerald-50/50'}`}
                        >
                            入会済み ({stepLeads.filter(l => l.status === 'active').length})
                        </Button>
                        <Button
                            variant={stepLeadFilter === 'withdrawn' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStepLeadFilter('withdrawn')}
                            className={`rounded-xl text-xs h-8 ${stepLeadFilter === 'withdrawn' ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'text-rose-700 border-rose-200 bg-rose-50/50'}`}
                        >
                            退会済み ({stepLeads.filter(l => l.status === 'withdrawn').length})
                        </Button>
                    </div>

                    {/* リード一覧テーブル */}
                    <Card className="border-slate-100 shadow-sm rounded-2xl bg-white overflow-hidden">
                        {isLoadingStepLeads ? (
                            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                                <p className="text-slate-400 text-sm">ステップ配信データを読み込んでいます...</p>
                            </div>
                        ) : stepLeads.length === 0 ? (
                            <div className="text-center p-12 space-y-3">
                                <AlertCircle className="h-10 w-10 text-slate-300 mx-auto" />
                                <h4 className="text-slate-500 text-base font-medium">登録されている公式LINE友だちはいません</h4>
                                <p className="text-slate-400 text-xs">事務局公式LINEが友だち追加されると、自動的にここに表示されます。</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead>生徒名 / LINE表示名</TableHead>
                                        <TableHead>ステータス（CRM）</TableHead>
                                        <TableHead>ステップ配信進捗</TableHead>
                                        <TableHead>次回配信予定</TableHead>
                                        <TableHead>友だち追加日時</TableHead>
                                        <TableHead className="w-[150px] text-right">配信操作</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stepLeads
                                        .filter(l => stepLeadFilter === 'all' || l.status === stepLeadFilter)
                                        .map((lead: any) => {
                                            const isStopped = lead.step_stage === -1 || lead.is_blocked
                                            const stageLabels: Record<number, string> = {
                                                0: '未送信（待機中）',
                                                1: 'Step 1 送信済 (24h)',
                                                2: 'Step 2 送信済 (72h)',
                                                3: 'Step 3 送信済 (120h)'
                                            }

                                            return (
                                                <TableRow key={lead.line_user_id} className="hover:bg-slate-50/50">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                                <User className="h-3.5 w-3.5 text-slate-400" />
                                                                <span>{lead.full_name || lead.display_name || '公式LINE友だち'}</span>
                                                                {lead.student_id && (
                                                                    <Link href={`/customers/${lead.student_id}`} className="text-indigo-600 hover:text-indigo-500 ml-1">
                                                                        <ExternalLink className="h-3 w-3" />
                                                                    </Link>
                                                                )}
                                                            </div>
                                                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[180px]">
                                                                {lead.line_user_id}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select 
                                                            value={lead.status || 'friend_only'} 
                                                            onValueChange={(val) => handleUpdateStepLeadStatus(lead.line_user_id, val)}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs rounded-full font-medium w-[140px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="friend_only">
                                                                    <span className="text-amber-700 font-medium">LINE友だち追加のみ</span>
                                                                </SelectItem>
                                                                <SelectItem value="inquired">
                                                                    <span className="text-sky-700 font-medium">問い合わせ・相談中</span>
                                                                </SelectItem>
                                                                <SelectItem value="applied">
                                                                    <span className="text-blue-700 font-medium">申し込み済み</span>
                                                                </SelectItem>
                                                                <SelectItem value="trial_done">
                                                                    <span className="text-purple-700 font-medium">体験済み</span>
                                                                </SelectItem>
                                                                <SelectItem value="active">
                                                                    <span className="text-emerald-700 font-medium">入会済み</span>
                                                                </SelectItem>
                                                                <SelectItem value="withdrawn">
                                                                    <span className="text-rose-700 font-medium">退会済み</span>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isStopped ? (
                                                            <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 text-xs font-normal">
                                                                {lead.is_blocked ? 'ブロック中' : '配信停止済'}
                                                            </Badge>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                                                                <Send className="h-3 w-3" />
                                                                {stageLabels[lead.step_stage] || `Stage ${lead.step_stage}`}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {lead.next_send_at && !isStopped ? (
                                                            <span className="flex items-center gap-1 text-indigo-600 font-medium font-mono">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(lead.next_send_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">―</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500 font-mono">
                                                        {lead.followed_at ? new Date(lead.followed_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '―'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleUpdateStepLeadStatus(lead.line_user_id, lead.status, !isStopped)}
                                                            className={`text-xs rounded-xl h-7 px-2.5 ${isStopped ? 'text-indigo-600 border-indigo-200 hover:bg-indigo-50' : 'text-slate-500 hover:text-red-600 hover:border-red-200'}`}
                                                        >
                                                            {isStopped ? '配信を再開' : '配信を停止'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                </TableBody>
                            </Table>
                        )}
                    </Card>
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
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-semibold text-slate-700">生徒名 *</Label>
                                        {allStudents.filter(s => s.coach_id === selectedLogForSchedule?.coach_id).length > 0 && (
                                            <label className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium cursor-pointer hover:text-indigo-700">
                                                <input
                                                    type="checkbox"
                                                    checked={onlyAssignedCoachStudents}
                                                    onChange={(e) => setOnlyAssignedCoachStudents(e.target.checked)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                                />
                                                担当生徒（{allStudents.filter(s => s.coach_id === selectedLogForSchedule?.coach_id).length}名）のみ表示
                                            </label>
                                        )}
                                    </div>
                                    
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
                                                        className="text-xs bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm"
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
                                        <SelectContent className="max-h-64">
                                            {(onlyAssignedCoachStudents 
                                                ? allStudents.filter(s => s.coach_id === selectedLogForSchedule?.coach_id)
                                                : [
                                                    ...allStudents.filter(s => s.coach_id === selectedLogForSchedule?.coach_id),
                                                    ...allStudents.filter(s => s.coach_id !== selectedLogForSchedule?.coach_id)
                                                  ]
                                            ).map(student => {
                                                const isAssigned = student.coach_id === selectedLogForSchedule?.coach_id
                                                return (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        <div className="flex items-center justify-between gap-2 w-full">
                                                            <span>{student.full_name}</span>
                                                            {isAssigned && (
                                                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium border border-indigo-100">
                                                                    担当
                                                                </span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* レッスン種別の選択 */}
                                <div className="flex flex-col gap-2">
                                    <Label className="text-sm font-semibold text-slate-700">レッスン種別 *</Label>
                                    <Select value={scheduleLessonMasterId} onValueChange={handleLessonMasterChange}>
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
                                            onChange={(e) => handleStartTimeChange(e.target.value)}
                                            className="rounded-xl border-slate-200"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold text-slate-700">終了日時 *</Label>
                                            <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                                自動計算
                                            </span>
                                        </div>
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
