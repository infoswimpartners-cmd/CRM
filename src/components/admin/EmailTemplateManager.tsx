'use client'

import { useState, useRef, useEffect, useCallback, startTransition } from 'react'
import { EmailTemplate, EmailTrigger, updateEmailTemplate, deleteEmailTemplate, addEmailTemplate, reorderEmailTemplates, updateEmailTrigger, updateLessonMasterEmailTemplate, duplicateEmailTemplate } from '@/actions/email-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Save, Trash2, SlidersHorizontal, Settings2, GripVertical, MessageSquare, ChevronDown, ChevronUp, ExternalLink, Copy, Edit3 } from 'lucide-react'
import { TestEmailDialog } from './TestEmailDialog'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

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
        { key: 'amount', label: '金額' },
        { key: 'payment_link', label: '決済リンク' },
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
                <div 
                    className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                    onClick={() => setShowMainVariables(!showMainVariables)}
                >
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-600">📌 変数を挿入</span>
                        {showMainVariables ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                            挿入先：
                            <span className={`font-bold ml-1 ${field === 'subject' ? 'text-cyan-600' : 'text-indigo-600'}`}>
                                {field === 'subject' ? '📝 件名' : '📄 本文'}
                            </span>
                        </span>
                        <span className="text-xs text-cyan-600 font-medium bg-cyan-50 px-1.5 py-0.5 rounded">
                            {showMainVariables ? '非表示にする' : '表示する'}
                        </span>
                    </div>
                </div>
                {showMainVariables && (
                    <div className="p-2.5 flex flex-wrap gap-1.5 transition-all">
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
                )}
            </div>
        )
    }

    return (
        <>
            {/* 全体はページ高さいっぱいに広げ、スクロールはここ一箇所のみ */}
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
                                <div className="flex-none flex flex-col lg:flex-row lg:items-center justify-between bg-gray-50/70 border border-gray-200 rounded-lg px-4 py-2 gap-3">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Mail className="w-4 h-4 text-cyan-600 flex-none" />

                                        <Dialog open={isHeaderEditOpen} onOpenChange={setIsHeaderEditOpen}>
                                            <DialogTrigger asChild>
                                                <div className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer hover:bg-white/50 p-1 rounded transition-colors group">
                                                    <div className="h-7 text-[10px] font-mono px-2 py-0.5 w-auto max-w-[160px] bg-gray-100 border border-gray-200 rounded text-gray-500 truncate flex-none group-hover:border-cyan-200">
                                                        {templateKey}
                                                    </div>
                                                    <span className="text-gray-300 flex-none">/</span>
                                                    <div className="h-7 text-sm font-semibold truncate flex-1 min-w-0 group-hover:text-cyan-700">
                                                        {subject || '名称未設定'}
                                                    </div>
                                                    <Settings2 className="w-3 h-3 text-gray-300 group-hover:text-cyan-500 flex-none ml-1" />
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[500px]">
                                                <DialogHeader>
                                                    <DialogTitle>テンプレート名の変更</DialogTitle>
                                                    <DialogDescription>
                                                        キー名と件名を編集できます。キー名はシステム識別子として使用されます。
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-4 py-4">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="key" className="text-xs text-gray-500">キー（システムID）</Label>
                                                        <Input
                                                            id="key"
                                                            value={templateKey}
                                                            onChange={e => setTemplateKey(e.target.value)}
                                                            className="font-mono text-xs"
                                                            placeholder="例: lesson_reminder"
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="subject" className="text-xs text-gray-500">件名（タイトル）</Label>
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
                                                        className="bg-cyan-600 hover:bg-cyan-700"
                                                    >
                                                        変更を保存
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-none overflow-x-auto pb-1 sm:pb-0">
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
                                        <Button onClick={handleSave} disabled={isSaving} size="sm" className="bg-cyan-600 hover:bg-cyan-700 h-8 px-3 flex-none">
                                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                                            保存
                                        </Button>
                                    </div>
                                </div>

                                {/* 説明 + 件名 + トグル群 */}
                                <div className="flex-none space-y-2.5">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-3">
                                            <Label className="w-10 flex-none text-xs text-gray-500">説明</Label>
                                            <Input
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                className="flex-1 h-8 text-sm bg-white"
                                                placeholder="このテンプレートの用途（例：体験レッスン予約確定メール）"
                                            />
                                        </div>
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
                                        onFocus={() => {
                                            saveBodySelection();
                                            setPopupBody(body);
                                            setIsPopupEditorOpen(true);
                                        }}
                                        onClick={() => {
                                            setPopupBody(body);
                                            setIsPopupEditorOpen(true);
                                        }}
                                        className="flex-1 font-mono text-sm leading-relaxed resize-none p-3 min-h-0 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                        placeholder="クリックしてメール本文を大きく編集..."
                                        readOnly
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
                    {/* 集客・体験申し込み関連 */}
                    <div className="flex-none mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Mail className="w-5 h-4 text-cyan-600" />
                            集客・体験申し込み通知
                        </h2>
                    </div>
                    {triggersList.filter(t => ['inquiry_received', 'reception_completed', 'trial_lesson_reserved', 'trial_form_submitted_admin', 'trial_lesson_reminder', 'trial_lesson_followup'].includes(t.id)).map(trigger => (
                        <TriggerCard key={trigger.id} trigger={trigger} />
                    ))}

                    {/* 決済・入会関連 */}
                    <div className="flex-none mb-4 mt-8 pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Save className="w-5 h-4 text-emerald-600" />
                            決済・入会のお礼メール設定
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">決済完了時や入会完了時に送信される、お礼メールの設定です。</p>
                    </div>
                    {triggersList.filter(t => ['payment_success', 'payment_failed', 'trial_payment_completed', 'trio_trial_payment_completed', 'enrollment_completed'].includes(t.id)).map(trigger => (
                        <TriggerCard key={trigger.id} trigger={trigger} />
                    ))}

                    {/* レッスン・報告関連 */}
                    <div className="flex-none mb-4 mt-8 pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <MessageSquare className="w-5 h-4 text-indigo-600" />
                            レッスン・指導報告
                        </h2>
                    </div>
                    {triggersList.filter(t => !['inquiry_received', 'reception_completed', 'trial_lesson_reserved', 'trial_form_submitted_admin', 'trial_lesson_reminder', 'trial_lesson_followup', 'payment_success', 'payment_failed', 'trial_payment_completed', 'enrollment_completed'].includes(t.id)).map(trigger => (
                        <TriggerCard key={trigger.id} trigger={trigger} />
                    ))}


                    {/* 体験レッスンプラン別設定 */}
                    <div className="flex-none mb-4 mt-8 pt-6 border-t border-gray-200">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-indigo-600" />
                            体験レッスンプラン別メール設定
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            各種体験レッスンの予約確定時に、個別のメールテンプレートを送信するように設定できます。未設定の場合は、標準の「体験レッスンが予約された時」のメールが送られます。
                        </p>
                    </div>
                    {trialMastersList.map(master => (
                        <div key={master.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <span className="font-semibold text-gray-900 text-sm">{master.name}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-none">
                                <Select
                                    value={master.email_template_id || 'none'}
                                    onValueChange={val => handleTrialMasterUpdate(master.id, val === 'none' ? null : val)}
                                >
                                    <SelectTrigger className="w-[300px] bg-white border-gray-300 text-sm h-8">
                                        <SelectValue placeholder="メールを選択..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none" className="text-gray-400 italic">-- 標準の予約自動返信を利用 --</SelectItem>
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
        </Tabs>

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
