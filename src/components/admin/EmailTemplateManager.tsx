'use client'

import { useState, useRef, useEffect, useCallback, startTransition } from 'react'
import { EmailTemplate, EmailTrigger, updateEmailTemplate, deleteEmailTemplate, addEmailTemplate, reorderEmailTemplates, updateEmailTrigger, updateLessonMasterEmailTemplate, duplicateEmailTemplate } from '@/actions/email-template'
import { getLineConfigAction, saveLineConfigAction } from '@/actions/leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Save, Trash2, SlidersHorizontal, Settings2, GripVertical, MessageSquare, ChevronDown, ChevronUp, ExternalLink, Copy, Edit3, Search, Eye, Smartphone, Filter, MessageCircle } from 'lucide-react'
import { TestEmailDialog } from './TestEmailDialog'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

// Dnd Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableEmailItem, getTemplateMeta } from './SortableEmailItem'

// トリガーごとの変数定義マップ
const TRIGGER_VARIABLES: Record<string, { key: string; label: string }[]> = {
    inquiry_received: [
        { key: 'name', label: '氏名' },
        { key: 'subject', label: 'お問い合わせ件名' },
        { key: 'user_name', label: 'ユーザー名' },
        { key: 'admin_url', label: '管理画面URL' },
        { key: 'all_inputs', label: '全入力内容' },
    ],
    reception_completed: [
        { key: 'name', label: '氏名' },
        { key: 'kana', label: 'フリガナ' },
        { key: 'email', label: 'メールアドレス' },
        { key: 'phone', label: '電話番号' },
        { key: 'station', label: '最寄り駅' },
        { key: '第一希望', label: '第1希望日' },
        { key: '第二希望', label: '第2希望日' },
        { key: '第三希望', label: '第3希望日' },
        { key: 'goal', label: '泳力・目標' },
        { key: 'frequency', label: '希望頻度' },
        { key: 'second_name', label: '2人目お名前' },
        { key: 'other', label: 'その他（備考）' },
        { key: 'all_inputs', label: '全入力内容' },
    ],
    trial_form_submitted_admin: [
        { key: 'name', label: '申込者氏名' },
        { key: 'kana', label: 'フリガナ' },
        { key: 'email', label: 'メールアドレス' },
        { key: 'phone', label: '電話番号' },
        { key: 'station', label: '最寄り駅' },
        { key: '第一希望', label: '第1希望日' },
        { key: '第二希望', label: '第2希望日' },
        { key: '第三希望', label: '第3希望日' },
        { key: 'goal', label: '泳力・目標' },
        { key: 'frequency', label: '希望頻度' },
        { key: 'second_name', label: '2人目お名前' },
        { key: 'birth_date', label: '生年月日' },
        { key: 'age', label: '年齢（生年月日から自動計算）' },
        { key: 'second_student_birth_date', label: '2人目生年月日' },
        { key: 'second_student_age', label: '2人目年齢（生年月日から自動計算）' },
        { key: 'message', label: '備考・メッセージ(結合)' },
        { key: 'other', label: 'その他（備考）' },
        { key: 'type_label', label: '種別（体験/問い合わせ）' },
        { key: 'all_inputs', label: '全入力内容' },
    ],
    trial_lesson_reserved: [
        { key: 'name', label: '氏名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: 'レッスン場所' },
        { key: 'coach_name', label: '担当コーチ名' },
        { key: 'coach_line_url', label: 'コーチLINE追加URL' },
        { key: 'amount', label: '体験レッスン料金' },
        { key: 'payment_link', label: '決済リンクURL' },
        { key: 'second_student_info', label: '2人目の情報' },
    ],
    trial_payment_completed: [
        { key: 'full_name', label: '氏名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: '施設名・集合場所' },
        { key: 'coach_name', label: 'コーチ名' },
        { key: 'amount', label: '金額' },
    ],
    enrollment_completed: [
        { key: 'name', label: '氏名' },
        { key: 'plan_name', label: 'プラン名' },
        { key: 'start_date', label: '開始日' },
    ],
    payment_success: [
        { key: 'name', label: '氏名' },
        { key: 'student_name', label: '生徒名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'date', label: '日付' },
        { key: 'time', label: '時刻' },
        { key: 'title', label: '内容/チケット名' },
        { key: 'amount', label: '金額' },
        { key: 'payment_link', label: '決済リンク' },
        { key: 'payment_url', label: '決済URL' },
    ],
    payment_failed: [
        { key: 'name', label: '氏名' },
        { key: 'amount', label: '金額' },
        { key: 'card_update_url', label: 'カード更新URL' },
    ],
    lesson_report_sent: [
        { key: 'coach_name', label: 'コーチ名' },
        { key: 'student_name', label: '生徒名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: '場所' },
        { key: 'lesson_type', label: 'レッスン種別' },
        { key: 'price', label: '金額' },
        { key: 'description', label: '指導メモ' },
    ],
    notice_lesson_report: [
        { key: 'coach_name', label: 'コーチ名' },
        { key: 'student_name', label: '生徒名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: '場所' },
        { key: 'lesson_type', label: 'レッスン種別' },
        { key: 'price', label: '金額' },
        { key: 'description', label: '指導メモ' },
    ],
    trial_reminder: [
        { key: 'name', label: '氏名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: '場所' },
    ],
    lesson_cancelled: [
        { key: 'name', label: '氏名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: '場所' },
        { key: 'coach_name', label: 'コーチ名' },
    ],
    trio_trial_payment_completed: [
        { key: 'name', label: '氏名' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'title', label: '内容/プラン名' },
        { key: 'amount', label: '金額' },
    ],
    lesson_reminder: [
        { key: 'name', label: '生徒氏名' },
        { key: 'student_name', label: '生徒氏名' },
        { key: 'date', label: 'レッスン日 (例: 8月28日(金))' },
        { key: 'time', label: 'レッスン時刻 (例: 10:00〜11:00)' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'coach_name', label: '担当コーチ名' },
        { key: 'location', label: 'レッスン場所' },
        { key: 'notes', label: '特記事項・連絡事項' },
    ],
    lesson_reminder_line: [
        { key: 'name', label: '生徒氏名' },
        { key: 'student_name', label: '生徒氏名' },
        { key: 'date', label: 'レッスン日 (例: 8月28日(金))' },
        { key: 'time', label: 'レッスン時刻 (例: 10:00〜11:00)' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'coach_name', label: '担当コーチ名' },
        { key: 'location', label: 'レッスン場所' },
        { key: 'notes', label: '特記事項・連絡事項' },
    ],
    lesson_reminder_email: [
        { key: 'name', label: '生徒氏名' },
        { key: 'student_name', label: '生徒氏名' },
        { key: 'date', label: 'レッスン日 (例: 8月28日(金))' },
        { key: 'time', label: 'レッスン時刻 (例: 10:00〜11:00)' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'coach_name', label: '担当コーチ名' },
        { key: 'location', label: 'レッスン場所' },
        { key: 'notes', label: '特記事項・連絡事項' },
    ],
    lesson_reminder_coach: [
        { key: 'name', label: '生徒氏名' },
        { key: 'student_name', label: '生徒氏名' },
        { key: 'date', label: 'レッスン日 (例: 8月28日(金))' },
        { key: 'time', label: 'レッスン時刻 (例: 10:00〜11:00)' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'coach_name', label: '担当コーチ名' },
        { key: 'location', label: 'レッスン場所' },
        { key: 'notes', label: '連絡事項' },
        { key: 'previous_lesson', label: '前回の練習内容ブロック' },
    ],
    lead_assigned: [
        { key: 'name', label: '顧客氏名' },
        { key: 'coach_name', label: '担当コーチ名' },
        { key: 'coach_line_url', label: 'コーチLINE追加URL' },
        { key: 'lesson_date', label: '確定体験日時' },
        { key: 'location', label: '確定レッスン場所' },
        { key: 'amount', label: '体験レッスン料金' },
        { key: 'payment_link', label: '決済リンクURL' },
        { key: 'second_student_info', label: '2人目の顧客情報' },
    ],
}

export interface TrialMaster { id: string; name: string; email_template_id: string | null }

export function EmailTemplateManager({ templates, triggers, trialMasters = [] }: { templates: EmailTemplate[], triggers: EmailTrigger[], trialMasters?: TrialMaster[] }) {
    const [templatesList, setTemplatesList] = useState(templates)
    useEffect(() => { setTemplatesList(templates) }, [templates])

    const [triggersList, setTriggersList] = useState(triggers)
    useEffect(() => { setTriggersList(triggers) }, [triggers])

    const [trialMastersList, setTrialMastersList] = useState(trialMasters)
    useEffect(() => { setTrialMastersList(trialMasters) }, [trialMasters])

    // SSR/クライアントのハイドレーション不一致を防ぐためのフラグ（dnd-kit用）
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => { setIsMounted(true) }, [])

    // Google Chat設定の展開状態
    const [expandedChat, setExpandedChat] = useState<Record<string, boolean>>({})
    const [chatDrafts, setChatDrafts] = useState<Record<string, { url: string; enabled: boolean; messageTemplate: string }>>(() => {
        const initial: Record<string, { url: string; enabled: boolean; messageTemplate: string }> = {}
        triggers.forEach(t => {
            initial[t.id] = {
                url: t.google_chat_webhook_url || '',
                enabled: t.google_chat_enabled || false,
                messageTemplate: t.google_chat_message_template || ''
            }
        })
        return initial
    })

    // triggers (props) の更新に同期させて chatDrafts を更新
    useEffect(() => {
        setChatDrafts(prev => {
            const next = { ...prev }
            triggers.forEach(t => {
                next[t.id] = {
                    url: t.google_chat_webhook_url || '',
                    enabled: t.google_chat_enabled || false,
                    messageTemplate: t.google_chat_message_template || ''
                }
            })
            return next
        })
    }, [triggers])

    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(templates[0] || null)
    const [subject, setSubject] = useState(templates[0]?.subject || '')
    const [body, setBody] = useState(templates[0]?.body || '')
    const [templateKey, setTemplateKey] = useState(templates[0]?.key || '')
    const [description, setDescription] = useState(templates[0]?.description || '')
    const [isApprovalRequired, setIsApprovalRequired] = useState(templates[0]?.is_approval_required || false)
    const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(templates[0]?.is_auto_send_enabled ?? true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isDuplicating, setIsDuplicating] = useState(false)
    const [isHeaderEditOpen, setIsHeaderEditOpen] = useState(false)

    // Google Chat メッセージポップアップエディタ用の状態管理
    const [activeChatTriggerId, setActiveChatTriggerId] = useState<string | null>(null)
    const [chatTemplateBody, setChatTemplateBody] = useState('')
    const chatTextareaRef = useRef<HTMLTextAreaElement>(null)
    const savedChatSelection = useRef<{ start: number; end: number }>({ start: 0, end: 0 })

    // LINE通知設定（アサイン確定時）の状態管理
    const [lineToken, setLineToken] = useState('')
    const [lineTemplate, setLineTemplate] = useState('')
    const [loadingLineConfig, setLoadingLineConfig] = useState(false)
    const [savingLineConfig, setSavingLineConfig] = useState(false)
    const lineTextareaRef = useRef<HTMLTextAreaElement>(null)
    const savedLineSelection = useRef<{ start: number; end: number }>({ start: 0, end: 0 })

    const fetchLineConfig = useCallback(async () => {
        setLoadingLineConfig(true)
        try {
            const res = await getLineConfigAction()
            if (res.success) {
                setLineToken(res.token)
                setLineTemplate(res.template)
            }
        } catch (err) {
            console.error('Failed to fetch LINE config:', err)
        } finally {
            setLoadingLineConfig(false)
        }
    }, [])

    useEffect(() => {
        fetchLineConfig()
    }, [fetchLineConfig])

    const handleSaveLineConfig = async () => {
        setSavingLineConfig(true)
        try {
            const res = await saveLineConfigAction(lineToken, lineTemplate)
            if (res.success) {
                toast({ title: '保存しました', description: 'LINE通知設定を更新しました。' })
            } else {
                toast({ title: 'エラー', description: res.error || '保存に失敗しました。', variant: 'destructive' })
            }
        } catch {
            toast({ title: 'エラー', description: '保存に失敗しました。', variant: 'destructive' })
        } finally {
            setSavingLineConfig(false)
        }
    }

    const saveLineSelectionPos = useCallback(() => {
        const el = lineTextareaRef.current
        if (!el) return
        savedLineSelection.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    }, [])

    const insertVariableToLine = useCallback((variable: string) => {
        const textToInsert = `{{${variable}}}`
        const { start, end } = savedLineSelection.current

        setLineTemplate(prev => {
            const next = prev.substring(0, start) + textToInsert + prev.substring(end)
            const newPos = start + textToInsert.length
            savedLineSelection.current = { start: newPos, end: newPos }
            setTimeout(() => {
                const el = lineTextareaRef.current
                if (el) {
                    el.focus()
                    el.setSelectionRange(newPos, newPos)
                }
            }, 0)
            return next
        })
    }, [])

    const saveChatSelectionPos = useCallback(() => {
        const el = chatTextareaRef.current
        if (!el) return
        savedChatSelection.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    }, [])

    const insertVariableToChat = useCallback((variable: string) => {
        const textToInsert = `{{${variable}}}`
        const { start, end } = savedChatSelection.current

        setChatTemplateBody(prev => {
            const next = prev.substring(0, start) + textToInsert + prev.substring(end)
            const newPos = start + textToInsert.length
            savedChatSelection.current = { start: newPos, end: newPos }
            setTimeout(() => {
                const el = chatTextareaRef.current
                if (el) {
                    el.focus()
                    el.setSelectionRange(newPos, newPos)
                }
            }, 0)
            return next
        })
    }, [])

    const handleChatTemplateSave = () => {
        if (!activeChatTriggerId) return
        setChatDrafts(prev => ({
            ...prev,
            [activeChatTriggerId]: {
                ...prev[activeChatTriggerId],
                messageTemplate: chatTemplateBody
            }
        }))
        toast({
            title: 'メッセージを反映しました',
            description: '「Google Chat設定を保存」ボタンを押すことで変更が確定します。',
        })
        setActiveChatTriggerId(null)
    }

    // ポップアップエディタ用の状態管理（完全レスポンシブ・ライトテーマ）
    const [isPopupEditorOpen, setIsPopupEditorOpen] = useState(false)
    const [popupBody, setPopupBody] = useState('')
    const popupTextareaRef = useRef<HTMLTextAreaElement>(null)
    const savedPopupSelection = useRef<{ start: number; end: number }>({ start: 0, end: 0 })
    const [showPopupVariables, setShowPopupVariables] = useState(true)
    const [showMainVariables, setShowMainVariables] = useState(true)
    const [showPopupInnerVariables, setShowPopupInnerVariables] = useState(true)

    const savePopupSelectionPos = useCallback(() => {
        const el = popupTextareaRef.current
        if (!el) return
        savedPopupSelection.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    }, [])

    const insertVariableToPopup = useCallback((variable: string) => {
        const textToInsert = `{{${variable}}}`
        const { start, end } = savedPopupSelection.current

        setPopupBody(prev => {
            const next = prev.substring(0, start) + textToInsert + prev.substring(end)
            const newPos = start + textToInsert.length
            savedPopupSelection.current = { start: newPos, end: newPos }
            setTimeout(() => {
                const el = popupTextareaRef.current
                if (el) {
                    el.focus()
                    el.setSelectionRange(newPos, newPos)
                }
            }, 0)
            return next
        })
    }, [])

    // 新規作成用状態
    const [isCreating, setIsCreating] = useState(false)
    const [newKey, setNewKey] = useState('')
    const [newSubject, setNewSubject] = useState('')
    const [newBody, setNewBody] = useState('')
    const [newDescription, setNewDescription] = useState('')

    // フィルタリング用状態
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'lesson' | 'trial' | 'billing' | 'inquiry'>('all')
    const [targetFilter, setTargetFilter] = useState<'all' | 'student' | 'coach_admin'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [editorViewMode, setEditorViewMode] = useState<'edit' | 'preview_email' | 'preview_line'>('edit')

    // フィルタリング処理
    const filteredTemplates = templatesList.filter(tmpl => {
        const meta = getTemplateMeta(tmpl.key)
        if (categoryFilter !== 'all' && meta.category !== categoryFilter) return false
        if (targetFilter !== 'all' && meta.target !== targetFilter) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            const matchesKey = tmpl.key.toLowerCase().includes(q)
            const matchesSubject = tmpl.subject.toLowerCase().includes(q)
            const matchesDesc = (tmpl.description || '').toLowerCase().includes(q)
            if (!matchesKey && !matchesSubject && !matchesDesc) return false
        }
        return true
    })

    const filteredTriggers = triggersList.filter(trigger => {
        const meta = getTemplateMeta(trigger.id)
        if (categoryFilter !== 'all' && meta.category !== categoryFilter) return false
        if (targetFilter !== 'all' && meta.target !== targetFilter) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            const matchesId = trigger.id.toLowerCase().includes(q)
            const matchesName = trigger.name.toLowerCase().includes(q)
            const matchesDesc = (trigger.description || '').toLowerCase().includes(q)
            if (!matchesId && !matchesName && !matchesDesc) return false
        }
        return true
    })

    const { toast } = useToast()

    // ---- 変数挿入: カーソル位置を mousedown で保存して blur 後でも使える ----
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const subjectRef = useRef<HTMLInputElement>(null)
    // { field: 'subject'|'body', start: number, end: number }
    const savedSelection = useRef<{ field: 'subject' | 'body'; start: number; end: number }>({ field: 'body', start: 0, end: 0 })

    const saveSubjectSelection = useCallback(() => {
        const el = subjectRef.current
        if (!el) return
        savedSelection.current = { field: 'subject', start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    }, [])

    const saveBodySelection = useCallback(() => {
        const el = textareaRef.current
        if (!el) return
        savedSelection.current = { field: 'body', start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }
    }, [])

    const insertVariable = useCallback((variable: string) => {
        const textToInsert = `{{${variable}}}`
        const { field, start, end } = savedSelection.current

        if (field === 'subject') {
            setSubject(prev => {
                const next = prev.substring(0, start) + textToInsert + prev.substring(end)
                const newPos = start + textToInsert.length
                savedSelection.current = { ...savedSelection.current, start: newPos, end: newPos }
                setTimeout(() => {
                    const el = subjectRef.current
                    if (el) { el.focus(); el.setSelectionRange(newPos, newPos) }
                }, 0)
                return next
            })
        } else {
            setBody(prev => {
                const next = prev.substring(0, start) + textToInsert + prev.substring(end)
                const newPos = start + textToInsert.length
                savedSelection.current = { ...savedSelection.current, start: newPos, end: newPos }
                setTimeout(() => {
                    const el = textareaRef.current
                    if (el) { el.focus(); el.setSelectionRange(newPos, newPos) }
                }, 0)
                return next
            })
        }
    }, [])

    // DnD
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    // トリガーごとのカードコンポーネント
    const TriggerCard = ({ trigger }: { trigger: EmailTrigger }) => {
        const draft = chatDrafts[trigger.id] || { url: '', enabled: false, messageTemplate: '' }
        const chatExpanded = expandedChat[trigger.id] || false
        
        return (
            <div key={trigger.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-4">
                {/* メイン行 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3">
                    <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{trigger.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono text-gray-400 bg-gray-50">{trigger.id}</Badge>
                            {['trial_lesson_reserved', 'trial_payment_completed', 'trio_trial_payment_completed', 'payment_success', 'enrollment_completed'].includes(trigger.id) && (
                                <Badge className="text-[10px] bg-[#06C755] text-white border-none font-bold hover:bg-[#06C755]">
                                    <MessageSquare className="w-2.5 h-2.5 mr-1" />LINE優先配信
                                </Badge>
                            )}
                            {draft.enabled && draft.url && (
                                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                                    <MessageSquare className="w-2.5 h-2.5 mr-1" />Chat ON
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {trigger.description}
                            {['trial_lesson_reserved', 'trial_payment_completed', 'trio_trial_payment_completed', 'payment_success', 'enrollment_completed'].includes(trigger.id) && (
                                <span className="text-[10px] text-emerald-600 block mt-1 font-medium">※LINE連携済みの生徒には、メールの代わりにLINEへ優先配信されます。</span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-none">
                        <Select
                            value={trigger.template_id || 'none'}
                            onValueChange={val => handleTriggerUpdate(trigger.id, val === 'none' ? null : val, trigger.is_enabled)}
                            disabled={!trigger.is_enabled}
                        >
                            <SelectTrigger className="w-[200px] bg-white border-gray-300 text-sm h-8">
                                <SelectValue placeholder="メールを選択..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-gray-400 italic">-- 送信しない --</SelectItem>
                                {templatesList.map(tmpl => (
                                    <SelectItem key={tmpl.id} value={tmpl.id}>
                                        {tmpl.subject} ({tmpl.key})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1.5">
                            <Switch
                                checked={trigger.is_enabled}
                                onCheckedChange={checked => handleTriggerUpdate(trigger.id, trigger.template_id, checked)}
                            />
                            <span className="text-xs text-gray-500 w-7">{trigger.is_enabled ? 'ON' : 'OFF'}</span>
                        </div>
                        <Button
                            variant="outline" size="sm"
                            className={`gap-1 text-xs h-8 ${chatExpanded ? 'bg-green-50 border-green-300 text-green-700' : 'text-gray-600'}`}
                            onClick={() => setExpandedChat(prev => ({ ...prev, [trigger.id]: !prev[trigger.id] }))}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Google Chat
                            {chatExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </Button>
                    </div>
                </div>

                {/* Google Chat 設定パネル */}
                {chatExpanded && (
                    <div className="border-t border-gray-100 bg-green-50/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-green-800 flex items-center gap-1.5">
                                <MessageSquare className="w-4 h-4 text-green-600" />
                                Google Chat Webhook 設定
                            </span>
                            <a href="https://developers.google.com/workspace/chat/quickstart/webhooks" target="_blank" rel="noreferrer"
                                className="text-xs text-blue-500 underline flex items-center gap-0.5">
                                URLの取得方法 <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs text-gray-600">Webhook URL</Label>
                                <Input
                                    value={draft.url}
                                    onChange={e => setChatDrafts(prev => {
                                        const current = prev[trigger.id] || { url: '', enabled: false, messageTemplate: '' }
                                        return { ...prev, [trigger.id]: { ...current, url: e.target.value } }
                                    })}
                                    placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                                    className="font-mono text-xs bg-white h-8"
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-none pb-0.5">
                                <Switch
                                    checked={draft.enabled}
                                    onCheckedChange={checked => setChatDrafts(prev => {
                                        const current = prev[trigger.id] || { url: '', enabled: false, messageTemplate: '' }
                                        return { ...prev, [trigger.id]: { ...current, enabled: checked } }
                                    })}
                                />
                                <Label className="text-xs">{draft.enabled ? 'Chat ON' : 'Chat OFF'}</Label>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <Label className="text-xs text-gray-600 flex items-center gap-1">
                                    カスタムメッセージ
                                    <span className="text-[10px] text-gray-400 font-normal">（空の場合はメール本文を送信）</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] gap-1 text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
                                    onClick={() => {
                                        setChatTemplateBody(draft.messageTemplate)
                                        setActiveChatTriggerId(trigger.id)
                                    }}
                                >
                                    <Edit3 className="w-3 h-3" />
                                    ポップアップでメッセージを編集
                                </Button>
                            </div>
                            <Textarea
                                value={draft.messageTemplate}
                                readOnly
                                onClick={() => {
                                    setChatTemplateBody(draft.messageTemplate)
                                    setActiveChatTriggerId(trigger.id)
                                }}
                                placeholder="※空の場合は、デフォルトで『メールの件名 ＋ 本文』がGoogle Chatに送信されます。クリックして見出しの調整や変数を埋め込んだ自由なカスタムメッセージを作成可能です。"
                                className="font-mono text-[10px] h-16 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-600 cursor-pointer resize-none leading-relaxed transition-colors"
                            />
                        </div>
                        <div className="flex justify-end pt-1">
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8 text-xs font-bold"
                                onClick={() => handleChatSave(trigger.id)}>
                                <Save className="w-3.5 h-3.5" />
                                Google Chat設定を保存
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        )
    }


    const handleSelect = (tmpl: EmailTemplate) => {
        setIsCreating(false)
        setSelectedTemplate(tmpl)
        setSubject(tmpl.subject)
        setBody(tmpl.body)
        setTemplateKey(tmpl.key)
        setDescription(tmpl.description || '')
        setIsApprovalRequired(tmpl.is_approval_required || false)
        setIsAutoSendEnabled(tmpl.is_auto_send_enabled ?? true)
        savedSelection.current = { field: 'body', start: 0, end: 0 }
    }

    const handleSave = async () => {
        if (!selectedTemplate) return
        setIsSaving(true)
        try {
            await updateEmailTemplate(selectedTemplate.id, subject, body, isApprovalRequired, isAutoSendEnabled, templateKey, description)
            toast({ title: '保存しました', description: 'メールテンプレートを更新しました。' })
            setTemplatesList(prev => prev.map(t => t.id === selectedTemplate.id
                ? { ...t, subject, body, is_approval_required: isApprovalRequired, is_auto_send_enabled: isAutoSendEnabled, key: templateKey, description }
                : t))
        } catch {
            toast({ title: 'エラー', description: '保存に失敗しました。', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!selectedTemplate) return
        if (!window.confirm('本当にこのテンプレートを削除しますか？\n削除後は元に戻せません。')) return
        setIsDeleting(true)
        try {
            await deleteEmailTemplate(selectedTemplate.id)
            toast({ title: '削除しました' })
            setTemplatesList(prev => prev.filter(t => t.id !== selectedTemplate.id))
            setSelectedTemplate(null)
        } catch {
            toast({ title: 'エラー', description: '削除に失敗しました。', variant: 'destructive' })
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDuplicate = async () => {
        if (!selectedTemplate) return
        setIsDuplicating(true)
        try {
            const newTemplate = await duplicateEmailTemplate(selectedTemplate.id)
            toast({ title: '複製しました', description: 'テンプレートをコピーしました。' })
            setTemplatesList(prev => [...prev, newTemplate])
            setSelectedTemplate(newTemplate)
            setSubject(newTemplate.subject)
            setBody(newTemplate.body)
            setTemplateKey(newTemplate.key)
            setDescription(newTemplate.description || '')
            setIsApprovalRequired(newTemplate.is_approval_required || false)
            setIsAutoSendEnabled(newTemplate.is_auto_send_enabled ?? true)
        } catch (error: any) {
            toast({
                title: '複製エラー',
                description: error.message,
                variant: 'destructive',
            })
        } finally {
            setIsDuplicating(false)
        }
    }

    const handleCreate = async () => {
        if (!newKey || !newSubject) {
            toast({ title: 'エラー', description: 'キーと件名は必須です。', variant: 'destructive' })
            return
        }
        setIsSaving(true)
        try {
            await addEmailTemplate({ key: newKey, subject: newSubject, body: newBody, description: newDescription })
            toast({ title: '作成しました' })
            setIsCreating(false)
            setNewKey(''); setNewSubject(''); setNewBody(''); setNewDescription('')
        } catch (e: any) {
            toast({ title: 'エラー', description: e.message || '作成に失敗しました。', variant: 'destructive' })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (active.id !== over?.id) {
            setTemplatesList(items => {
                const oldIndex = items.findIndex(i => i.id === active.id)
                const newIndex = items.findIndex(i => i.id === over?.id)
                const newList = arrayMove(items, oldIndex, newIndex)
                const updates = newList.map((tmpl, idx) => ({ id: tmpl.id, sort_order: idx + 1 }))
                startTransition(() => {
                    reorderEmailTemplates(updates).catch(() =>
                        toast({ title: '並び替えエラー', description: '保存に失敗しました。', variant: 'destructive' })
                    )
                })
                return newList
            })
        }
    }

    const handleTriggerUpdate = async (id: string, template_id: string | null, is_enabled: boolean) => {
        try {
            await updateEmailTrigger(id, template_id, is_enabled)
            setTriggersList(prev => prev.map(t => t.id === id ? { ...t, template_id, is_enabled } : t))
            toast({ title: '保存しました', description: '自動送信ロジックを更新しました。' })
        } catch {
            toast({ title: 'エラー', description: '更新に失敗しました。', variant: 'destructive' })
        }
    }

    const handleTrialMasterUpdate = async (id: string, email_template_id: string | null) => {
        try {
            await updateLessonMasterEmailTemplate(id, email_template_id)
            setTrialMastersList(prev => prev.map(m => m.id === id ? { ...m, email_template_id } : m))
            toast({ title: '保存しました', description: '体験レッスンプランのメール設定を更新しました。' })
        } catch {
            toast({ title: 'エラー', description: '更新に失敗しました。', variant: 'destructive' })
        }
    }

    const handleChatSave = async (id: string) => {
        const draft = chatDrafts[id] || { url: '', enabled: false, messageTemplate: '' }
        const trigger = triggersList.find(t => t.id === id)
        if (!trigger) return
        try {
            await updateEmailTrigger(id, trigger.template_id, trigger.is_enabled, draft.url || null, draft.enabled, draft.messageTemplate || null)
            setTriggersList(prev => prev.map(t => t.id === id ? {
                ...t,
                google_chat_webhook_url: draft.url || null,
                google_chat_enabled: draft.enabled,
                google_chat_message_template: draft.messageTemplate || null
            } : t))
            toast({ title: 'Google Chat設定を保存しました' })
        } catch {
            toast({ title: 'エラー', description: 'Google Chat設定の保存に失敗しました。', variant: 'destructive' })
        }
    }

    // このテンプレートで使える推奨変数を計算
    const getRecommendedVars = (tmpl: EmailTemplate) => {
        const related = triggersList.filter(t => t.template_id === tmpl.id)
        const vars: { key: string; label: string }[] = []
        
        // トリガーに紐づく変数
        related.forEach(trigger => {
            ; (TRIGGER_VARIABLES[trigger.id] || []).forEach(v => {
                if (!vars.find(rv => rv.key === v.key)) vars.push(v)
            })
        })

        // テンプレートキー直接定義の変数
        const directVars = TRIGGER_VARIABLES[tmpl.key] || []
        directVars.forEach(v => {
            if (!vars.find(rv => rv.key === v.key)) vars.push(v)
        })

        return vars
    }

    // プレビュー用のダミー置換処理
    const DUMMY_PREVIEW_DATA: Record<string, string> = {
        name: 'テスト太郎',
        student_name: 'テスト太郎',
        full_name: 'テスト太郎',
        date: '8月28日(金)',
        time: '10:00〜11:00',
        lesson_date: '8月28日(金) 10:00〜11:00',
        coach_name: '田中 健太',
        coach_line_url: 'https://line.me/ti/p/coach_kenta',
        location: '渋谷区立スポーツセンター プール',
        notes: '持ち物: 水着・キャップ',
        subject: 'お問い合わせ内容の確認',
        user_name: 'テスト太郎',
        amount: '6,000',
        plan_name: '月4回パーソナルプラン',
        start_date: '2026年9月1日',
        payment_link: 'https://manager.swim-partners.com/pay/trial/sched_example123',
        payment_url: 'https://manager.swim-partners.com/pay/trial/sched_example123',
        second_student_info: '',
        phone: '090-1234-5678',
        email: 'test@example.com',
        previous_lesson: '━━━━━━━━━━━━━━\n【前回の練習内容 (8/20(木))】\n・ビート板を持った呼吸付きクロールの練習。足首の曲がりを次回修正。\n・次回への課題: キック時の足首の脱力\n・良かった点: 姿勢が安定してきた\n━━━━━━━━━━━━━━'
    }

    const renderPreviewText = (templateStr: string): string => {
        let res = templateStr || ''
        Object.entries(DUMMY_PREVIEW_DATA).forEach(([k, v]) => {
            res = res.replace(new RegExp(`{{${k}}}`, 'g'), v)
        })
        return res
    }

    // 変数パネルコンポーネント（絵文字なし）
    const VariablePanel = ({ tmpl }: { tmpl: EmailTemplate }) => {
        const recommended = getRecommendedVars(tmpl)
        const extra = (tmpl.variables || []).filter(v => !recommended.find(rv => rv.key === v))
        const field = savedSelection.current.field

        return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                <div 
                    className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                    onClick={() => setShowMainVariables(!showMainVariables)}
                >
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-700">変数の挿入</span>
                        {showMainVariables ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                            挿入先:
                            <span className={`font-semibold ml-1 ${field === 'subject' ? 'text-slate-900' : 'text-slate-900'}`}>
                                {field === 'subject' ? '件名' : '本文'}
                            </span>
                        </span>
                        <span className="text-xs text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {showMainVariables ? '閉じる' : '展開'}
                        </span>
                    </div>
                </div>
                {showMainVariables && (
                    <div className="p-2.5 flex flex-wrap gap-1.5 transition-all">
                        {recommended.length > 0 && recommended.map(v => (
                            <button
                                key={v.key}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key) }}
                                title={v.label}
                                className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-400 transition-all cursor-pointer text-left"
                            >
                                <code className="text-[11px] font-mono text-slate-800">{`{{${v.key}}}`}</code>
                                <span className="text-[10px] text-slate-500">{v.label}</span>
                            </button>
                        ))}
                        {extra.map(v => (
                            <button
                                key={v}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); insertVariable(v) }}
                                className="flex items-center px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 transition-all cursor-pointer"
                            >
                                <code className="text-[11px] font-mono text-slate-700">{`{{${v}}}`}</code>
                            </button>
                        ))}
                        {recommended.length === 0 && extra.length === 0 && (
                            <span className="text-xs text-slate-400 py-0.5">
                                自動送信ロジック設定でこのテンプレートをトリガーに割り当てると推奨変数が表示されます
                            </span>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            {/* 全体コントロール */}
            <div className="space-y-4">
                {/* フィルター＆検索ヘッダー */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-3">
                    {/* ジャンル選択ピル */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <span className="text-xs font-semibold text-slate-500 flex-none mr-1 flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5" />
                            ジャンル:
                        </span>
                        {[
                            { key: 'all', label: 'すべて' },
                            { key: 'lesson', label: 'レッスン・リマインド' },
                            { key: 'trial', label: '体験レッスン' },
                            { key: 'billing', label: '入会・決済' },
                            { key: 'inquiry', label: 'お問い合わせ' },
                        ].map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setCategoryFilter(cat.key as any)}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-none ${
                                    categoryFilter === cat.key
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* 検索・対象者フィルター */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-slate-100">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <Input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="テンプレート名、件名、キーで検索..."
                                className="pl-9 h-8 text-xs bg-slate-50/50 focus:bg-white border-slate-200"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                                >
                                    クリア
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-none">
                            <span className="text-xs text-slate-500 flex-none">送信先:</span>
                            <Select value={targetFilter} onValueChange={(val: any) => setTargetFilter(val)}>
                                <SelectTrigger className="w-[140px] h-8 text-xs bg-white border-slate-200">
                                    <SelectValue placeholder="対象者" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全対象</SelectItem>
                                    <SelectItem value="student">生徒向け</SelectItem>
                                    <SelectItem value="coach_admin">コーチ・管理者向け</SelectItem>
                                </SelectContent>
                            </Select>
                            <span className="text-xs text-slate-400 flex-none font-mono">
                                ({filteredTemplates.length}件)
                            </span>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="templates" className="w-full h-[calc(100vh-230px)] flex flex-col">
                    {/* タブバー */}
                    <div className="flex-none flex items-center gap-4 mb-3 border-b border-slate-200 pb-2">
                        <TabsList className="bg-slate-100 p-1">
                            <TabsTrigger value="templates" className="flex items-center gap-1.5 px-4 py-1.5 text-xs">
                                <Mail className="w-3.5 h-3.5" /> テンプレート一覧・編集
                            </TabsTrigger>
                            <TabsTrigger value="triggers" className="flex items-center gap-1.5 px-4 py-1.5 text-xs">
                                <SlidersHorizontal className="w-3.5 h-3.5" /> 自動送信ロジック設定
                            </TabsTrigger>
                            <TabsTrigger value="line" className="flex items-center gap-1.5 px-4 py-1.5 text-xs text-green-700 data-[state=active]:bg-white data-[state=active]:text-green-800">
                                <MessageCircle className="w-3.5 h-3.5 text-green-600" /> LINE通知設定（体験確定）
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* ===== テンプレート編集タブ ===== */}
                    <TabsContent value="templates" className="flex-1 min-h-0 mt-0">
                        <div className="flex gap-4 h-full">
                            {/* サイドバー：テンプレートリスト */}
                            <div className="w-72 flex-none flex flex-col gap-2 overflow-y-auto pr-2 border-r border-slate-200">
                                <Button
                                    onClick={() => { setIsCreating(true); setSelectedTemplate(null) }}
                                    className={`w-full flex-none h-8 text-xs font-medium ${isCreating ? 'bg-slate-800 text-white' : ''}`}
                                    variant="outline"
                                    size="sm"
                                >
                                    + 新規テンプレート作成
                                </Button>
                                <div className="text-[11px] text-slate-400 flex items-center justify-between px-0.5">
                                    <span>ドラッグで並び替え</span>
                                    <GripVertical className="w-3 h-3" />
                                </div>

                                {filteredTemplates.length === 0 ? (
                                    <div className="text-xs text-slate-400 text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                        該当するテンプレートがありません
                                    </div>
                                ) : isMounted ? (
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                        <SortableContext items={filteredTemplates.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-1.5">
                                                {filteredTemplates.map(tmpl => (
                                                    <SortableEmailItem
                                                        key={tmpl.id}
                                                        tmpl={tmpl}
                                                        isSelected={selectedTemplate?.id === tmpl.id}
                                                        onClick={() => handleSelect(tmpl)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                ) : (
                                    <div className="space-y-1.5">
                                        {filteredTemplates.map(tmpl => (
                                            <button
                                                key={tmpl.id}
                                                onClick={() => handleSelect(tmpl)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${selectedTemplate?.id === tmpl.id
                                                    ? 'bg-slate-100 text-slate-900 border border-slate-300'
                                                    : 'hover:bg-slate-50 text-slate-700'
                                                    }`}
                                            >
                                                {tmpl.key}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* エディタ領域 */}
                            <div className="flex-1 min-w-0 flex flex-col h-full bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                {selectedTemplate ? (
                                    <div className="flex flex-col h-full gap-3">
                                        {/* ヘッダー */}
                                        <div className="flex-none flex flex-col lg:flex-row lg:items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 gap-3">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Dialog open={isHeaderEditOpen} onOpenChange={setIsHeaderEditOpen}>
                                                    <DialogTrigger asChild>
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                                                            <div className="h-6 text-[11px] font-mono px-2 py-0.5 w-auto max-w-[160px] bg-white border border-slate-200 rounded text-slate-600 truncate flex-none group-hover:border-slate-400">
                                                                {templateKey}
                                                            </div>
                                                            <span className="text-slate-300 flex-none">/</span>
                                                            <div className="h-6 text-sm font-semibold truncate flex-1 min-w-0 text-slate-900 group-hover:text-slate-700">
                                                                {subject || '名称未設定'}
                                                            </div>
                                                            <Settings2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 flex-none ml-1" />
                                                        </div>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[500px]">
                                                        <DialogHeader>
                                                            <DialogTitle>テンプレート名の変更</DialogTitle>
                                                            <DialogDescription>
                                                                システム識別子（キー）と件名を変更できます。
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="grid gap-4 py-4">
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="key" className="text-xs text-slate-500">キー（システムID）</Label>
                                                                <Input
                                                                    id="key"
                                                                    value={templateKey}
                                                                    onChange={e => setTemplateKey(e.target.value)}
                                                                    className="font-mono text-xs"
                                                                    placeholder="例: lesson_reminder"
                                                                />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label htmlFor="subject" className="text-xs text-slate-500">件名（タイトル）</Label>
                                                                <Input
                                                                    id="subject"
                                                                    value={subject}
                                                                    onChange={e => setSubject(e.target.value)}
                                                                    placeholder="メールのタイトル"
                                                                />
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="outline" onClick={() => setIsHeaderEditOpen(false)}>キャンセル</Button>
                                                            <Button
                                                                onClick={async () => {
                                                                    if (!selectedTemplate) return;
                                                                    try {
                                                                        await updateEmailTemplate(selectedTemplate.id, subject, body, isApprovalRequired, isAutoSendEnabled, templateKey, description);
                                                                        setTemplatesList(prev => prev.map(t => t.id === selectedTemplate.id
                                                                            ? { ...t, key: templateKey, subject, description }
                                                                            : t));
                                                                        toast({ title: '保存しました', description: 'テンプレート名を更新しました。' });
                                                                        setIsHeaderEditOpen(false);
                                                                    } catch (e: any) {
                                                                        toast({ title: 'エラー', description: e.message || '保存に失敗しました。', variant: 'destructive' });
                                                                    }
                                                                }}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white"
                                                            >
                                                                変更を保存
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-none">
                                                <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" size="icon" className="w-8 h-8 flex-none" title="削除">
                                                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </Button>
                                                <TestEmailDialog
                                                    templateKey={selectedTemplate.key}
                                                    subject={subject}
                                                    body={body}
                                                    triggers={triggersList}
                                                    templateId={selectedTemplate.id}
                                                />
                                                <Button onClick={handleDuplicate} disabled={isDuplicating} variant="outline" size="icon" className="w-8 h-8 flex-none" title="複製">
                                                    {isDuplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                                </Button>
                                                <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-8 px-3 flex-none text-xs font-medium">
                                                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                                    保存
                                                </Button>
                                            </div>
                                        </div>

                                        {/* 説明 + 設定項目 */}
                                        <div className="flex-none space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label className="w-12 flex-none text-xs text-slate-500">説明</Label>
                                                <Input
                                                    value={description}
                                                    onChange={e => setDescription(e.target.value)}
                                                    className="flex-1 h-7 text-xs bg-white border-slate-200"
                                                    placeholder="用途の補足説明（例：前日のレッスンリマインド）"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                                    <span className="font-medium text-slate-800">自動送信</span>
                                                    <Switch checked={isAutoSendEnabled} onCheckedChange={setIsAutoSendEnabled} />
                                                </div>
                                                <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                                    <span className="font-medium text-slate-800">送信前承認</span>
                                                    <Switch checked={isApprovalRequired} onCheckedChange={setIsApprovalRequired} disabled={!isAutoSendEnabled} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ビュー切り替えタブ（編集 / メールプレビュー / LINEプレビュー） */}
                                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setEditorViewMode('edit')}
                                                    className={`px-3 py-1 text-xs rounded-t font-medium transition-colors ${
                                                        editorViewMode === 'edit'
                                                            ? 'bg-slate-100 text-slate-900 border border-b-0 border-slate-200'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    編集（エディタ）
                                                </button>
                                                <button
                                                    onClick={() => setEditorViewMode('preview_email')}
                                                    className={`px-3 py-1 text-xs rounded-t font-medium transition-colors flex items-center gap-1 ${
                                                        editorViewMode === 'preview_email'
                                                            ? 'bg-slate-100 text-slate-900 border border-b-0 border-slate-200'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    <Eye className="w-3 h-3" /> メール表示プレビュー
                                                </button>
                                                <button
                                                    onClick={() => setEditorViewMode('preview_line')}
                                                    className={`px-3 py-1 text-xs rounded-t font-medium transition-colors flex items-center gap-1 ${
                                                        editorViewMode === 'preview_line'
                                                            ? 'bg-slate-100 text-slate-900 border border-b-0 border-slate-200'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    <Smartphone className="w-3 h-3" /> LINE表示プレビュー
                                                </button>
                                            </div>

                                            <span className="text-[11px] text-slate-400 font-mono">
                                                {body.length} 文字
                                            </span>
                                        </div>

                                        {/* 本文エリア / プレビューエリア */}
                                        {editorViewMode === 'edit' ? (
                                            <div className="flex-1 min-h-0 flex flex-col gap-2">
                                                <VariablePanel tmpl={selectedTemplate} />
                                                <Textarea
                                                    ref={textareaRef}
                                                    value={body}
                                                    onChange={e => setBody(e.target.value)}
                                                    onFocus={() => {
                                                        saveBodySelection();
                                                        setPopupBody(body);
                                                        setIsPopupEditorOpen(true);
                                                    }}
                                                    onClick={() => {
                                                        setPopupBody(body);
                                                        setIsPopupEditorOpen(true);
                                                    }}
                                                    className="flex-1 font-mono text-xs leading-relaxed resize-none p-3 min-h-0 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors border-slate-200"
                                                    placeholder="クリックして本文を全画面エディタで編集..."
                                                    readOnly
                                                />
                                            </div>
                                        ) : editorViewMode === 'preview_email' ? (
                                            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/50 border border-slate-200 rounded-lg p-4 font-sans text-xs space-y-3">
                                                <div className="border-b border-slate-200 pb-2 space-y-1 text-slate-600">
                                                    <div><span className="font-semibold text-slate-700">件名:</span> {subject}</div>
                                                    <div><span className="font-semibold text-slate-700">宛先:</span> テスト太郎 様 &lt;test@example.com&gt;</div>
                                                </div>
                                                <div className="whitespace-pre-wrap leading-relaxed text-slate-800 font-mono">
                                                    {renderPreviewText(body)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100 border border-slate-200 rounded-lg p-4 flex justify-center">
                                                <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-2">
                                                    <div className="text-[11px] text-slate-400 border-b border-slate-100 pb-1">
                                                        公式LINE トーク画面イメージ
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-relaxed text-slate-900 whitespace-pre-wrap font-sans">
                                                        {renderPreviewText(body)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : isCreating ? (
                                    <div className="flex flex-col h-full gap-3">
                                        <div className="flex-none flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                                            <span className="font-semibold text-slate-800 text-xs">新規テンプレート作成</span>
                                            <div className="flex gap-2">
                                                <Button onClick={() => setIsCreating(false)} variant="outline" size="sm" className="h-7 text-xs">キャンセル</Button>
                                                <Button onClick={handleCreate} disabled={isSaving} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white h-7 text-xs">
                                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                                                    作成
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-none space-y-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">キー（システム識別子）</Label>
                                                <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="例: custom_notification" className="h-7 text-xs font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">説明</Label>
                                                <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="用途の簡単な説明" className="h-7 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">件名</Label>
                                                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} className="h-7 text-xs" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-h-0 flex flex-col">
                                            <Label className="flex-none text-xs mb-1">本文</Label>
                                            <Textarea value={newBody} onChange={e => setNewBody(e.target.value)} className="flex-1 font-mono text-xs leading-relaxed p-3 min-h-0 resize-none border-slate-200" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                                        左側のリストからテンプレートを選択するか、新規作成してください
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ===== 自動送信ロジック設定タブ ===== */}
                    <TabsContent value="triggers" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                        <div className="max-w-4xl mx-auto space-y-4 pb-6">
                            <div className="flex-none mb-3">
                                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                    <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                                    自動送信ロジック設定
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">システムイベントと送信メッセージの割り当てを一括設定できます。</p>
                            </div>

                            {filteredTriggers.length === 0 ? (
                                <div className="text-xs text-slate-400 text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    該当する自動送信ロジックがありません
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* レッスン・リマインド関連 */}
                                    {filteredTriggers.some(t => getTemplateMeta(t.id).category === 'lesson') && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                                <h3 className="text-xs font-bold text-slate-800">レッスン・リマインド関連</h3>
                                                <span className="text-[10px] text-slate-400">（前日リマインド / レッスン報告 / 予約通知）</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {filteredTriggers.filter(t => getTemplateMeta(t.id).category === 'lesson').map(trigger => (
                                                    <TriggerCard key={trigger.id} trigger={trigger} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 体験レッスン関連 */}
                                    {filteredTriggers.some(t => getTemplateMeta(t.id).category === 'trial') && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                                <h3 className="text-xs font-bold text-slate-800">体験レッスン・集客関連</h3>
                                                <span className="text-[10px] text-slate-400">（体験申込受付 / 予約確定 / 事前決済 / アサイン通知）</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {filteredTriggers.filter(t => getTemplateMeta(t.id).category === 'trial').map(trigger => (
                                                    <TriggerCard key={trigger.id} trigger={trigger} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 入会・決済関連 */}
                                    {filteredTriggers.some(t => getTemplateMeta(t.id).category === 'billing') && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                                <h3 className="text-xs font-bold text-slate-800">入会・決済関連</h3>
                                                <span className="text-[10px] text-slate-400">（本入会完了 / 一般決済 / 決済エラー）</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {filteredTriggers.filter(t => getTemplateMeta(t.id).category === 'billing').map(trigger => (
                                                    <TriggerCard key={trigger.id} trigger={trigger} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* お問い合わせ関連 */}
                                    {filteredTriggers.some(t => getTemplateMeta(t.id).category === 'inquiry') && (
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                                <h3 className="text-xs font-bold text-slate-800">お問い合わせ関連</h3>
                                                <span className="text-[10px] text-slate-400">（フォーム受付自動返信）</span>
                                            </div>
                                            <div className="space-y-2.5">
                                                {filteredTriggers.filter(t => getTemplateMeta(t.id).category === 'inquiry').map(trigger => (
                                                    <TriggerCard key={trigger.id} trigger={trigger} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 体験レッスンプラン別設定 */}
                            <div className="flex-none mb-3 mt-8 pt-6 border-t border-slate-200">
                                <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                                    <SlidersHorizontal className="w-4 h-4 text-slate-700" />
                                    体験レッスンプラン別メッセージ設定
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">
                                    各種体験レッスンの予約確定時に、個別のテンプレートを送信するように設定できます。未設定の場合は、標準の「体験レッスンが予約された時」のメッセージが送られます。
                                </p>
                            </div>
                            {trialMastersList.map(master => (
                                <div key={master.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <span className="font-semibold text-slate-900 text-xs">{master.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap flex-none">
                                        <Select
                                            value={master.email_template_id || 'none'}
                                            onValueChange={val => handleTrialMasterUpdate(master.id, val === 'none' ? null : val)}
                                        >
                                            <SelectTrigger className="w-[280px] bg-white border-slate-200 text-xs h-7">
                                                <SelectValue placeholder="メッセージを選択..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none" className="text-slate-400 italic">-- 標準の予約自動返信を利用 --</SelectItem>
                                                {templatesList.map(tmpl => (
                                                    <SelectItem key={tmpl.id} value={tmpl.id}>
                                                        {tmpl.subject} ({tmpl.key})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    {/* ===== LINE通知設定（アサイン確定時）タブ ===== */}
                    <TabsContent value="line" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full pb-6">
                            {/* 左カラム: エディタと設定 */}
                            <div className="lg:col-span-7 flex flex-col gap-4">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <MessageCircle className="w-4 h-4 text-green-600" />
                                                    体験アサイン確定時 LINE通知メッセージ
                                                </CardTitle>
                                                <CardDescription className="text-xs text-slate-500 mt-0.5">
                                                    コーチをアサイン・体験確定した際に、顧客のLINEアカウントへ自動送信される確定メッセージです。
                                                </CardDescription>
                                            </div>
                                            <Button
                                                onClick={handleSaveLineConfig}
                                                disabled={savingLineConfig || loadingLineConfig}
                                                className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8 text-xs font-bold shadow-sm"
                                            >
                                                {savingLineConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                LINE設定を保存
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        {/* LINE Access Token */}
                                        <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <Label className="text-xs font-bold text-slate-700">
                                                LINE Channel Access Token（Messaging API）
                                            </Label>
                                            <Input
                                                type="password"
                                                value={lineToken}
                                                onChange={e => setLineToken(e.target.value)}
                                                placeholder="LINE Developersコンソールで発行した長期Channel Access Token"
                                                className="font-mono text-xs bg-white h-8"
                                            />
                                            <p className="text-[10px] text-slate-400">
                                                ※顧客の `line_user_id` が登録されている場合にプッシュメッセージを自動送信するために使用します。
                                            </p>
                                        </div>

                                        {/* 変数のクリック挿入パネル */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold text-slate-700">利用可能な変数（クリックで挿入）</Label>
                                                <span className="text-[10px] text-slate-400">カーソル位置に挿入されます</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                {[
                                                    { key: 'name', label: '顧客氏名' },
                                                    { key: 'coach_name', label: '担当コーチ名' },
                                                    { key: 'lesson_date', label: '確定体験日時' },
                                                    { key: 'location', label: 'レッスン場所' },
                                                    { key: 'amount', label: '体験料金' },
                                                    { key: 'payment_link', label: '決済リンクURL' },
                                                    { key: 'coach_line_url', label: 'コーチLINE追加URL' },
                                                    { key: 'second_student_info', label: '2人目の顧客情報' },
                                                ].map(v => (
                                                    <button
                                                        key={v.key}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                            insertVariableToLine(v.key)
                                                        }}
                                                        className="flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-800 transition-all text-left shadow-xs"
                                                    >
                                                        <code className="text-[11px] font-mono text-slate-800 font-semibold">{`{{${v.key}}}`}</code>
                                                        <span className="text-[10px] text-slate-500">{v.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* メッセージ本文エディタ */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs font-bold text-slate-700">メッセージ本文</Label>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {lineTemplate.length} 文字
                                                </span>
                                            </div>
                                            <Textarea
                                                ref={lineTextareaRef}
                                                value={lineTemplate}
                                                onChange={e => setLineTemplate(e.target.value)}
                                                onSelect={saveLineSelectionPos}
                                                onKeyUp={saveLineSelectionPos}
                                                onMouseUp={saveLineSelectionPos}
                                                placeholder="アサイン確定時に送信するメッセージ本文を入力..."
                                                className="font-mono text-xs h-[300px] leading-relaxed resize-none bg-white focus-visible:ring-green-500 focus-visible:border-green-500"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 右カラム: スマホ風プレビュー */}
                            <div className="lg:col-span-5 flex flex-col items-center">
                                <div className="w-full max-w-[360px] bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800">
                                    {/* スマホ画面風ヘッダー */}
                                    <div className="bg-[#2c3e50] text-white px-4 py-2.5 rounded-t-[24px] flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center font-bold text-[10px]">
                                                SP
                                            </div>
                                            <div className="text-xs font-bold">Swim Partners 公式</div>
                                        </div>
                                        <Badge variant="outline" className="text-[9px] border-white/20 text-white/80 h-5">
                                            プレビュー
                                        </Badge>
                                    </div>

                                    {/* LINEトーク画面風ボディ */}
                                    <div className="bg-[#7494c0] min-h-[420px] max-h-[500px] overflow-y-auto p-3.5 space-y-3 rounded-b-[24px]">
                                        <div className="flex items-end gap-2">
                                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-slate-700 font-bold text-[10px] shadow-sm flex-none">
                                                SP
                                            </div>
                                            <div className="bg-white text-slate-800 p-3 rounded-2xl rounded-bl-xs text-xs shadow-md leading-relaxed whitespace-pre-wrap break-words max-w-[85%] font-sans">
                                                {renderPreviewText(lineTemplate)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 text-center">
                                    ※テスト太郎様のダミーデータでプレビュー表示しています。
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

        {/* プレミアムなメール本文編集用ポップアップモーダル（完全レスポンシブ・PCサイズ最適化・ライトテーマ） */}
        <Dialog open={isPopupEditorOpen} onOpenChange={setIsPopupEditorOpen}>
            <DialogContent className="w-[88vw] sm:max-w-none max-w-[96vw] h-[90vh] max-h-[92vh] p-0 flex flex-col overflow-hidden bg-slate-50 border border-slate-200 rounded-2xl shadow-2xl gap-0">
                <DialogHeader className="p-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <DialogTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-cyan-600" />
                            メール本文の編集（拡大画面）
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 mt-0.5">
                            PC画面に最適化された広いエディタで、変数を挿入しながら快適に本文を編集できます。
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* ポップアップメインコンテンツ：左右分割レイアウト（PC） */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row p-4 gap-4 bg-slate-50">
                    {/* 左側：変数挿入パネル */}
                    {showPopupVariables && (
                        <div className="w-full lg:w-72 flex-none flex flex-col gap-2 bg-white p-3 border border-slate-200 rounded-xl h-fit">
                            <div 
                                className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-lg transition-colors select-none"
                                onClick={() => setShowPopupInnerVariables(!showPopupInnerVariables)}
                            >
                                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                    📌 クリックして変数を挿入
                                    {showPopupInnerVariables ? (
                                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                </span>
                                <span className="text-xs text-cyan-600 font-medium bg-cyan-50 px-1.5 py-0.5 rounded">
                                    {showPopupInnerVariables ? '非表示にする' : '表示する'}
                                </span>
                            </div>
                            {showPopupInnerVariables && (
                                <>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        カーソル位置に自動で変数が差し込まれます。
                                    </p>
                                    <div className="overflow-y-auto flex-1 pr-1 space-y-3 mt-1 min-h-[120px] lg:min-h-0">
                                        <div>
                                            <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">推奨変数</span>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {selectedTemplate && getRecommendedVars(selectedTemplate).map(v => (
                                                    <button
                                                        key={v.key}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            insertVariableToPopup(v.key);
                                                        }}
                                                        title={v.label}
                                                        className="flex items-center gap-1 px-2 py-1 rounded border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400 transition-all cursor-pointer text-left"
                                                    >
                                                        <code className="text-[10px] font-mono text-cyan-800">{`{{${v.key}}}`}</code>
                                                        <span className="text-[9px] text-cyan-600 truncate max-w-[80px]">{v.label}</span>
                                                    </button>
                                                ))}
                                                {selectedTemplate && getRecommendedVars(selectedTemplate).length === 0 && (
                                                    <span className="text-[11px] text-slate-400">推奨変数はありません</span>
                                                )}
                                            </div>
                                        </div>

                                        {selectedTemplate && (selectedTemplate.variables || []).filter(v => !getRecommendedVars(selectedTemplate).find(rv => rv.key === v)).length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">その他の変数</span>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {(selectedTemplate.variables || []).filter(v => !getRecommendedVars(selectedTemplate).find(rv => rv.key === v)).map(v => (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                insertVariableToPopup(v);
                                                            }}
                                                            className="flex items-center px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                                                        >
                                                            <code className="text-[10px] font-mono text-slate-700">{`{{${v}}}`}</code>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* 右側：巨大エディタ領域 */}
                    <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden p-4 gap-3">
                        <div className="flex-none flex items-center justify-between border-b border-slate-100 pb-2 gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[11px] px-2 py-0 border-cyan-200 bg-cyan-50/50 text-cyan-700 hover:bg-cyan-50"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        setShowPopupVariables(!showPopupVariables);
                                    }}
                                >
                                    📋 {showPopupVariables ? '変数を非表示' : '変数を表示'}
                                </Button>
                                <span className="text-xs font-semibold text-slate-500 ml-1">件名：</span>
                                <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[300px] lg:max-w-[400px]">
                                    {subject || '（件名未設定）'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                文字数: {popupBody.length} 文字
                            </span>
                        </div>
                        <div className="flex-1 min-h-0">
                            <textarea
                                ref={popupTextareaRef}
                                value={popupBody}
                                onChange={e => {
                                    setPopupBody(e.target.value);
                                    // リアルタイムにカーソル位置を記録
                                    const el = e.target;
                                    savedPopupSelection.current = { start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
                                }}
                                onFocus={savePopupSelectionPos}
                                onKeyUp={savePopupSelectionPos}
                                onMouseUp={savePopupSelectionPos}
                                onClick={savePopupSelectionPos}
                                className="w-full h-full font-mono text-sm leading-relaxed p-4 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none overflow-y-auto"
                                placeholder="メール本文を入力..."
                            />
                        </div>
                    </div>
                </div>

                {/* フッター：適用とキャンセル */}
                <DialogFooter className="p-4 bg-white border-t border-slate-100 flex flex-row items-center justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsPopupEditorOpen(false)}
                        className="text-slate-600 hover:bg-slate-50 h-9"
                    >
                        変更を破棄して閉じる
                    </Button>
                    <Button
                        onClick={() => {
                            setBody(popupBody);
                            setIsPopupEditorOpen(false);
                            toast({
                                title: '本文を反映しました',
                                description: '「保存」ボタンを押すことで変更が確定します。',
                            });
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white h-9 px-4 font-medium"
                    >
                        編集を本文に適用する
                    </Button>
                </DialogFooter>
            </DialogContent>
            </Dialog>

            {/* Google Chat メッセージテンプレート編集ダイアログ */}
            <Dialog open={!!activeChatTriggerId} onOpenChange={(open) => !open && setActiveChatTriggerId(null)}>
                <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <MessageSquare className="w-4 h-4 text-green-600" />
                            Google Chat メッセージ編集 - {triggersList.find(t => t.id === activeChatTriggerId)?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            この自動送信ロジックが実行されたときに Google Chat へ送信されるメッセージの内容を編集します。
                        </DialogDescription>
                    </DialogHeader>

                    {activeChatTriggerId && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3">
                            {/* 左側: エディタ */}
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-xs font-bold text-slate-600">メッセージ本文（マークダウン対応）</Label>
                                <Textarea
                                    ref={chatTextareaRef}
                                    value={chatTemplateBody}
                                    onChange={(e) => setChatTemplateBody(e.target.value)}
                                    onSelect={saveChatSelectionPos}
                                    onKeyUp={saveChatSelectionPos}
                                    onMouseUp={saveChatSelectionPos}
                                    placeholder={`例: 📧 *新規問い合わせ* が届きました\nお名前: {{name}}\nメール: {{to}}`}
                                    className="font-mono text-xs h-[300px] leading-relaxed resize-none focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                                />
                                <p className="text-[10px] text-slate-400">
                                  ※ `**太字**` や `*イタリック*` のように記述すると Google Chat 上で装飾されて表示されます。
                                </p>
                            </div>

                            {/* 右側: 変数選択パネル */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-600">挿入可能な変数</Label>
                                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 max-h-[300px] overflow-y-auto space-y-1.5">
                                    {(TRIGGER_VARIABLES[activeChatTriggerId] || []).length > 0 ? (
                                        (TRIGGER_VARIABLES[activeChatTriggerId] || []).map(v => (
                                            <button
                                                key={v.key}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    insertVariableToChat(v.key);
                                                }}
                                                className="w-full text-left p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-[11px] font-medium flex items-center justify-between"
                                            >
                                                <span>{v.label}</span>
                                                <code className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-mono font-normal">
                                                    {v.key}
                                                </code>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic text-center py-4">
                                            利用可能な変数がありません。
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => setActiveChatTriggerId(null)} className="h-9 text-xs">
                            変更を破棄して閉じる
                        </Button>
                        <Button
                            onClick={handleChatTemplateSave}
                            className="bg-green-600 hover:bg-green-700 text-white h-9 text-xs font-bold"
                        >
                            編集をメッセージに適用する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
