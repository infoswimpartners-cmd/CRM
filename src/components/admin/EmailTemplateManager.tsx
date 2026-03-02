'use client'

import { useState, useRef, useEffect, useCallback, startTransition } from 'react'
import { EmailTemplate, EmailTrigger, updateEmailTemplate, deleteEmailTemplate, addEmailTemplate, reorderEmailTemplates, updateEmailTrigger } from '@/actions/email-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Save, Trash2, SlidersHorizontal, Settings2, GripVertical, MessageSquare, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { TestEmailDialog } from './TestEmailDialog'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Dnd Kit Imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableEmailItem } from './SortableEmailItem'

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
        { key: 'second_birth_date', label: '2人目生年月日' },
        { key: 'message', label: '備考・メッセージ(結合)' },
        { key: 'other', label: 'その他（備考）' },
        { key: 'type_label', label: '種別（体験/問い合わせ）' },
        { key: 'all_inputs', label: '全入力内容' },
    ],
    trial_lesson_reserved: [
        { key: 'name', label: '氏名' },
        { key: 'full_name', label: '氏名(full_name)' },
        { key: 'lesson_date', label: 'レッスン日時' },
        { key: 'location', label: '場所' },
        { key: 'amount', label: '金額' },
        { key: 'payment_link', label: '決済リンク' },
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
}

export function EmailTemplateManager({ templates, triggers }: { templates: EmailTemplate[], triggers: EmailTrigger[] }) {
    const [templatesList, setTemplatesList] = useState(templates)
    useEffect(() => { setTemplatesList(templates) }, [templates])

    const [triggersList, setTriggersList] = useState(triggers)
    useEffect(() => { setTriggersList(triggers) }, [triggers])

    // SSR/クライアントのハイドレーション不一致を防ぐためのフラグ（dnd-kit用）
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => { setIsMounted(true) }, [])

    // Google Chat設定の展開状態
    const [expandedChat, setExpandedChat] = useState<Record<string, boolean>>({})
    const [chatDrafts, setChatDrafts] = useState<Record<string, { url: string; enabled: boolean; messageTemplate: string }>>({})

    useEffect(() => {
        const initial: typeof chatDrafts = {}
        triggers.forEach(t => {
            initial[t.id] = {
                url: t.google_chat_webhook_url || '',
                enabled: t.google_chat_enabled || false,
                messageTemplate: t.google_chat_message_template || ''
            }
        })
        setChatDrafts(initial)
    }, [triggers])

    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(templates[0] || null)
    const [subject, setSubject] = useState(templates[0]?.subject || '')
    const [body, setBody] = useState(templates[0]?.body || '')
    const [isApprovalRequired, setIsApprovalRequired] = useState(templates[0]?.is_approval_required || false)
    const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(templates[0]?.is_auto_send_enabled ?? true)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // 新規作成
    const [isCreating, setIsCreating] = useState(false)
    const [newKey, setNewKey] = useState('')
    const [newSubject, setNewSubject] = useState('')
    const [newBody, setNewBody] = useState('')
    const [newDescription, setNewDescription] = useState('')

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

    const handleSelect = (tmpl: EmailTemplate) => {
        setIsCreating(false)
        setSelectedTemplate(tmpl)
        setSubject(tmpl.subject)
        setBody(tmpl.body)
        setIsApprovalRequired(tmpl.is_approval_required || false)
        setIsAutoSendEnabled(tmpl.is_auto_send_enabled ?? true)
        savedSelection.current = { field: 'body', start: 0, end: 0 }
    }

    const handleSave = async () => {
        if (!selectedTemplate) return
        setIsSaving(true)
        try {
            await updateEmailTemplate(selectedTemplate.id, subject, body, isApprovalRequired, isAutoSendEnabled)
            toast({ title: '保存しました', description: 'メールテンプレートを更新しました。' })
            setTemplatesList(prev => prev.map(t => t.id === selectedTemplate.id
                ? { ...t, subject, body, is_approval_required: isApprovalRequired, is_auto_send_enabled: isAutoSendEnabled }
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

    const handleChatSave = async (id: string) => {
        const draft = chatDrafts[id]
        if (!draft) return
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
        related.forEach(trigger => {
            ; (TRIGGER_VARIABLES[trigger.id] || []).forEach(v => {
                if (!vars.find(rv => rv.key === v.key)) vars.push(v)
            })
        })
        return vars
    }

    // 変数パネルコンポーネント
    const VariablePanel = ({ tmpl }: { tmpl: EmailTemplate }) => {
        const recommended = getRecommendedVars(tmpl)
        const extra = (tmpl.variables || []).filter(v => !recommended.find(rv => rv.key === v))
        const field = savedSelection.current.field

        return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-600">📌 変数を挿入</span>
                    <span className="text-[11px] text-slate-400">
                        挿入先：
                        <span className={`font-bold ml-1 ${field === 'subject' ? 'text-cyan-600' : 'text-indigo-600'}`}>
                            {field === 'subject' ? '📝 件名' : '📄 本文'}
                        </span>
                        <span className="text-slate-300 ml-1">（クリックで切替）</span>
                    </span>
                </div>
                <div className="p-2.5 flex flex-wrap gap-1.5">
                    {recommended.length > 0 && recommended.map(v => (
                        <button
                            key={v.key}
                            type="button"
                            // mouseDown で保存済みselectionを上書きせずに挿入
                            onMouseDown={(e) => { e.preventDefault(); insertVariable(v.key) }}
                            title={v.label}
                            className="flex items-center gap-1 px-2 py-1 rounded border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 hover:border-cyan-400 transition-all cursor-pointer"
                        >
                            <code className="text-[11px] font-mono text-cyan-800">{`{{${v.key}}}`}</code>
                            <span className="text-[10px] text-cyan-600">{v.label}</span>
                        </button>
                    ))}
                    {extra.map(v => (
                        <button
                            key={v}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); insertVariable(v) }}
                            className="flex items-center px-2 py-1 rounded border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer"
                        >
                            <code className="text-[11px] font-mono text-slate-700">{`{{${v}}}`}</code>
                        </button>
                    ))}
                    {recommended.length === 0 && extra.length === 0 && (
                        <span className="text-xs text-slate-400 py-0.5">
                            💡「自動送信ロジック設定」でこのテンプレートをトリガーに割り当てると変数が表示されます
                        </span>
                    )}
                </div>
            </div>
        )
    }

    return (
        // 全体はページ高さいっぱいに広げ、スクロールはここ一箇所のみ
        <Tabs defaultValue="templates" className="w-full h-[calc(100vh-130px)] flex flex-col">
            {/* タブバー */}
            <div className="flex-none flex items-center gap-4 mb-4 border-b border-gray-200 pb-2">
                <TabsList className="bg-gray-100/80 p-1">
                    <TabsTrigger value="templates" className="flex items-center gap-2 px-4 py-2">
                        <Mail className="w-4 h-4" /> テンプレート編集
                    </TabsTrigger>
                    <TabsTrigger value="triggers" className="flex items-center gap-2 px-4 py-2">
                        <SlidersHorizontal className="w-4 h-4" /> 自動送信ロジック設定
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* ===== テンプレート編集タブ ===== */}
            <TabsContent value="templates" className="flex-1 min-h-0 mt-0">
                <div className="flex gap-5 h-full">

                    {/* サイドバー：テンプレートリスト */}
                    <div className="w-64 flex-none flex flex-col gap-2 overflow-y-auto pr-2 border-r border-gray-100">
                        <Button
                            onClick={() => { setIsCreating(true); setSelectedTemplate(null) }}
                            className={`w-full flex-none ${isCreating ? 'bg-cyan-100 text-cyan-900 border-cyan-500' : ''}`}
                            variant="outline"
                            size="sm"
                        >
                            + 新規テンプレート作成
                        </Button>
                        <div className="text-[11px] text-gray-400 flex items-center justify-between px-0.5">
                            <span>ドラッグで並び替え</span>
                            <GripVertical className="w-3 h-3" />
                        </div>
                        {isMounted ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={templatesList.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1.5">
                                        {templatesList.map(tmpl => (
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
                            // SSR時はシンプルなリストを表示（ハイドレーション不一致を防ぐ）
                            <div className="space-y-1.5">
                                {templatesList.map(tmpl => (
                                    <button
                                        key={tmpl.id}
                                        onClick={() => handleSelect(tmpl)}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedTemplate?.id === tmpl.id
                                            ? 'bg-cyan-50 text-cyan-900 border border-cyan-200'
                                            : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {tmpl.key}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* エディタ領域 */}
                    <div className="flex-1 min-w-0 flex flex-col h-full">
                        {selectedTemplate ? (
                            <div className="flex flex-col h-full gap-3">
                                {/* ヘッダー：テンプレート名・ボタン群 */}
                                <div className="flex-none flex items-center justify-between bg-gray-50/70 border border-gray-200 rounded-lg px-4 py-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Settings2 className="w-4 h-4 text-gray-500 flex-none" />
                                        <span className="font-semibold text-gray-800 truncate">{selectedTemplate.subject || 'テンプレート設定'}</span>
                                        <code className="text-[11px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 flex-none">{selectedTemplate.key}</code>
                                    </div>
                                    <div className="flex gap-2 flex-none">
                                        <Button onClick={handleDelete} disabled={isDeleting} variant="destructive" size="icon" className="w-8 h-8">
                                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                        </Button>
                                        <TestEmailDialog
                                            templateKey={selectedTemplate.key}
                                            subject={subject}
                                            body={body}
                                            triggers={triggersList}
                                            templateId={selectedTemplate.id}
                                        />
                                        <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                            保存
                                        </Button>
                                    </div>
                                </div>

                                {/* 件名 + トグル群 */}
                                <div className="flex-none space-y-2.5">
                                    <div className="flex items-center gap-3">
                                        <Label className="w-10 flex-none text-sm">件名</Label>
                                        <Input
                                            ref={subjectRef}
                                            value={subject}
                                            onChange={e => setSubject(e.target.value)}
                                            onFocus={saveSubjectSelection}
                                            onKeyUp={saveSubjectSelection}
                                            onMouseUp={saveSubjectSelection}
                                            onClick={saveSubjectSelection}
                                            className="flex-1 font-medium"
                                            placeholder="件名を入力..."
                                        />
                                    </div>
                                    {/* 自動送信 / 承認フロー */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">自動送信</p>
                                                <p className="text-xs text-gray-400">OFFで自動送信停止</p>
                                            </div>
                                            <Switch checked={isAutoSendEnabled} onCheckedChange={setIsAutoSendEnabled} />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">承認フロー</p>
                                                <p className="text-xs text-gray-400">送信前に管理者承認</p>
                                            </div>
                                            <Switch checked={isApprovalRequired} onCheckedChange={setIsApprovalRequired} disabled={!isAutoSendEnabled} />
                                        </div>
                                    </div>
                                </div>

                                {/* 変数パネル */}
                                <div className="flex-none">
                                    <VariablePanel tmpl={selectedTemplate} />
                                </div>

                                {/* 本文エリア：残りの全高さを使う */}
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <Label className="flex-none text-sm mb-1.5">本文</Label>
                                    <Textarea
                                        ref={textareaRef}
                                        value={body}
                                        onChange={e => setBody(e.target.value)}
                                        onFocus={saveBodySelection}
                                        onKeyUp={saveBodySelection}
                                        onMouseUp={saveBodySelection}
                                        onClick={saveBodySelection}
                                        className="flex-1 font-mono text-sm leading-relaxed resize-none p-3 min-h-0"
                                        placeholder="メール本文を入力..."
                                    />
                                </div>
                            </div>

                        ) : isCreating ? (
                            <div className="flex flex-col h-full gap-3">
                                <div className="flex-none flex items-center justify-between bg-gray-50/70 border border-gray-200 rounded-lg px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-500" />
                                        <span className="font-semibold text-gray-800">新規テンプレート作成</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setIsCreating(false)} variant="outline" size="sm">キャンセル</Button>
                                        <Button onClick={handleCreate} disabled={isSaving} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                                            作成
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-none space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm">キー（一意の識別子）</Label>
                                        <Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="例: custom_notification" />
                                        <p className="text-xs text-gray-400">英数字とアンダースコアのみ推奨</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">説明</Label>
                                        <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="用途の簡単な説明" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-sm">件名</Label>
                                        <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <Label className="flex-none text-sm mb-1.5">本文</Label>
                                    <Textarea value={newBody} onChange={e => setNewBody(e.target.value)} className="flex-1 font-mono text-sm leading-relaxed p-3 min-h-0 resize-none" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                左側のリストからテンプレートを選択するか、新規作成してください
                            </div>
                        )}
                    </div>
                </div>
            </TabsContent>

            {/* ===== 自動送信ロジック設定タブ ===== */}
            <TabsContent value="triggers" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-3 pb-6">
                    <div className="flex-none mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-cyan-600" />
                            自動送信ロジック設定
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">どのイベントでどのメールを送るか、コード不要で設定できます。</p>
                    </div>
                    {triggersList.map(trigger => {
                        const draft = chatDrafts[trigger.id] || { url: '', enabled: false, messageTemplate: '' }
                        const chatExpanded = expandedChat[trigger.id] || false
                        return (
                            <div key={trigger.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                {/* メイン行 */}
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-3">
                                    <div className="flex-1 space-y-0.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-gray-900 text-sm">{trigger.name}</span>
                                            <Badge variant="outline" className="text-[10px] font-mono text-gray-400 bg-gray-50">{trigger.id}</Badge>
                                            {draft.enabled && draft.url && (
                                                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">
                                                    <MessageSquare className="w-2.5 h-2.5 mr-1" />Chat ON
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">{trigger.description}</p>
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
                                                    onChange={e => setChatDrafts(prev => ({ ...prev, [trigger.id]: { ...prev[trigger.id], url: e.target.value } }))}
                                                    placeholder="https://chat.googleapis.com/v1/spaces/.../messages?key=..."
                                                    className="font-mono text-xs bg-white h-8"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 flex-none pb-0.5">
                                                <Switch
                                                    checked={draft.enabled}
                                                    onCheckedChange={checked => setChatDrafts(prev => ({ ...prev, [trigger.id]: { ...prev[trigger.id], enabled: checked } }))}
                                                />
                                                <Label className="text-xs">{draft.enabled ? 'Chat ON' : 'Chat OFF'}</Label>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-600">
                                                カスタムメッセージ
                                                <span className="ml-1.5 text-gray-400 font-normal">（空の場合はメール本文と同じ内容を送信）</span>
                                            </Label>
                                            <Textarea
                                                value={draft.messageTemplate}
                                                onChange={e => setChatDrafts(prev => ({ ...prev, [trigger.id]: { ...prev[trigger.id], messageTemplate: e.target.value } }))}
                                                placeholder={`例: 📧 *新規問い合わせ* が届きました\nお名前: {{name}}\nメール: {{to}}`}
                                                className="font-mono text-xs h-20 bg-white resize-none"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 h-8"
                                                onClick={() => handleChatSave(trigger.id)}>
                                                <Save className="w-3.5 h-3.5" />
                                                Google Chat設定を保存
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </TabsContent>
        </Tabs>
    )
}
