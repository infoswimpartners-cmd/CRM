'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Send, MapPin, AlertCircle, Plus, Trash2, Eye, EyeOff, CheckCircle, Pencil } from 'lucide-react'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { 
    sendLeadNotificationAction,
    createWebhookAction,
    deleteWebhookAction,
    toggleWebhookAction,
    getLeadNotificationTemplateAction,
    saveLeadNotificationTemplateAction,
    getLeadAssignedNotificationTemplateAction,
    saveLeadAssignedNotificationTemplateAction,
    getLeadAssignedAdditionalWebhookTemplateAction,
    saveLeadAssignedAdditionalWebhookTemplateAction,
    getLeadAssignedWebhookUrlAction,
    saveLeadAssignedWebhookUrlAction,
    getDisplaySettingsAction,
    saveDisplaySettingsAction,
    getLineConfigAction,
    saveLineConfigAction,
    completeLeadManuallyAction,
    createLeadManuallyAction,
    updateLeadAction,
    cancelLeadAssignmentAction
} from '@/actions/leads'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

const itemLabels: Record<string, string> = {
    name: '氏名',
    full_name_kana: 'フリガナ',
    gender: '性別',
    age: '年齢',
    email: 'メールアドレス',
    phone: '電話番号',
    area: '希望エリア/最寄駅',
    lesson_location: 'レッスン予定場所',
    frequency: '希望頻度',
    available_times: '可能な曜日・時間帯',
    skill_level: '泳力レベル・目標',
    notes: 'その他要望・メモ',
    datetime: '希望日時',
    second_student: '2人目の顧客情報'
}
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

interface Lead {
    id: string
    name: string
    full_name_kana: string | null
    email: string | null
    phone: string | null
    area: string | null
    datetime1: string | null
    datetime2: string | null
    datetime3: string | null
    skill_level: string | null
    notes: string | null
    status: string | null
    lesson_location: string | null
    assigned_coach_id: string | null
    assigned_at: string | null
    confirmed_datetime: string | null
    confirmed_location: string | null
    created_at: string
}

interface Facility {
    id: string
    name: string
}

interface Webhook {
    id: string
    space_name: string
    webhook_url: string
    active: boolean
    created_at: string
}

interface Student {
    id: string
    full_name: string
    full_name_kana: string | null
    birth_date: string | null
    gender: string | null
    contact_email: string | null
    contact_phone: string | null
    line_user_id: string | null
    second_student_name: string | null
    second_student_name_kana: string | null
    second_student_birth_date: string | null
    second_student_gender: string | null
}

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [loading, setLoading] = useState(true)
    const [coaches, setCoaches] = useState<any[]>([])
    const [statusFilter, setStatusFilter] = useState<'unassigned' | 'assigned' | 'all'>('unassigned')

    // 各リードごとの設定状態
    const [selectedLocations, setSelectedLocations] = useState<Record<string, string>>({})
    const [selectedWebhooks, setSelectedWebhooks] = useState<Record<string, string>>({})
    const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({})
    const [completingStates, setCompletingStates] = useState<Record<string, boolean>>({})
    const [cancelingStates, setCancelingStates] = useState<Record<string, boolean>>({})

    // 新規Webhook追加用フォームのステート
    const [newSpaceName, setNewSpaceName] = useState('')
    const [newWebhookUrl, setNewWebhookUrl] = useState('')
    const [creatingWebhook, setCreatingWebhook] = useState(false)

    // ポップオーバーの開閉制御
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

    // テンプレート設定のステート
    const [notificationTemplate, setNotificationTemplate] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)
    const [assignedNotificationTemplate, setAssignedNotificationTemplate] = useState('')
    const [savingAssignedTemplate, setSavingAssignedTemplate] = useState(false)
    const [assignedWebhookUrl, setAssignedWebhookUrl] = useState('')
    const [savingAssignedWebhookUrl, setSavingAssignedWebhookUrl] = useState(false)
    const [assignedAdditionalTemplate, setAssignedAdditionalTemplate] = useState('')
    const [savingAssignedAdditionalTemplate, setSavingAssignedAdditionalTemplate] = useState(false)

    // 表示設定のステート
    const [displaySettings, setDisplaySettings] = useState<Record<string, string>>({})
    const [savingSettings, setSavingSettings] = useState(false)

    // LINE通知設定のステート
    const [lineToken, setLineToken] = useState('')
    const [lineTemplate, setLineTemplate] = useState('')
    const [savingLineConfig, setSavingLineConfig] = useState(false)
    const [showLineToken, setShowLineToken] = useState(false)

    // 新規手動案件作成用のステート
    const [students, setStudents] = useState<Student[]>([])
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [creatingLead, setCreatingLead] = useState(false)

    // 案件編集用のステート
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
    const [updatingLead, setUpdatingLead] = useState(false)
    const [editFormName, setEditFormName] = useState('')
    const [editFormFullNameKana, setEditFormFullNameKana] = useState('')
    const [editFormGender, setEditFormGender] = useState('')
    const [editFormBirthDate, setEditFormBirthDate] = useState('')
    const [editFormEmail, setEditFormEmail] = useState('')
    const [editFormPhone, setEditFormPhone] = useState('')
    const [editFormLineUserId, setEditFormLineUserId] = useState('')
    const [editFormArea, setEditFormArea] = useState('')
    const [editFormLessonLocation, setEditFormLessonLocation] = useState('')
    const [editFormDatetime1, setEditFormDatetime1] = useState('')
    const [editFormDatetime2, setEditFormDatetime2] = useState('')
    const [editFormDatetime3, setEditFormDatetime3] = useState('')
    const [editFormAvailableTimes, setEditFormAvailableTimes] = useState('')
    const [editFormFrequency, setEditFormFrequency] = useState('')
    const [editFormSkillLevel, setEditFormSkillLevel] = useState('')
    const [editFormNotes, setEditFormNotes] = useState('')
    const [editFormSecondStudentName, setEditFormSecondStudentName] = useState('')
    const [editFormSecondStudentKana, setEditFormSecondStudentKana] = useState('')
    const [editFormSecondStudentGender, setEditFormSecondStudentGender] = useState('')
    const [editFormSecondStudentBirthDate, setEditFormSecondStudentBirthDate] = useState('')
    const [editFormSendCustomerNotification, setEditFormSendCustomerNotification] = useState(true)
    const [editFormStatus, setEditFormStatus] = useState('')
    const [studentSearchOpen, setStudentSearchOpen] = useState(false)
    const [studentSearchQuery, setStudentSearchQuery] = useState('')
    const [facilitySearchOpen, setFacilitySearchOpen] = useState(false)

    const [formStudentId, setFormStudentId] = useState<string>('')
    const [formName, setFormName] = useState('')
    const [formFullNameKana, setFormFullNameKana] = useState('')
    const [formGender, setFormGender] = useState('')
    const [formBirthDate, setFormBirthDate] = useState('')
    const [formEmail, setFormEmail] = useState('')
    const [formPhone, setFormPhone] = useState('')
    const [formLineUserId, setFormLineUserId] = useState('')
    const [formArea, setFormArea] = useState('')
    const [formLessonLocation, setFormLessonLocation] = useState('')
    const [formDatetime1, setFormDatetime1] = useState('')
    const [formDatetime2, setFormDatetime2] = useState('')
    const [formDatetime3, setFormDatetime3] = useState('')
    const [formAvailableTimes, setFormAvailableTimes] = useState('')
    const [formFrequency, setFormFrequency] = useState('')
    const [formSkillLevel, setFormSkillLevel] = useState('')
    const [formNotes, setFormNotes] = useState('')
    
    // 2人目情報
    const [formSecondStudentName, setFormSecondStudentName] = useState('')
    const [formSecondStudentKana, setFormSecondStudentKana] = useState('')
    const [formSecondStudentGender, setFormSecondStudentGender] = useState('')
    const [formSecondStudentBirthDate, setFormSecondStudentBirthDate] = useState('')
    const [formSendCustomerNotification, setFormSendCustomerNotification] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const handleSelectStudent = (studentId: string) => {
        const student = students.find(s => s.id === studentId)
        if (!student) return

        const normalizeGender = (g: string | null | undefined): string => {
            if (!g) return ''
            if (g.includes('男')) return '男'
            if (g.includes('女')) return '女'
            return 'その他'
        }

        setFormStudentId(student.id)
        setFormName(student.full_name || '')
        setFormFullNameKana(student.full_name_kana || '')
        setFormGender(normalizeGender(student.gender))
        setFormBirthDate(student.birth_date || '')
        setFormEmail(student.contact_email || '')
        setFormPhone(student.contact_phone || '')
        setFormLineUserId(student.line_user_id || '')
        setFormSecondStudentName(student.second_student_name || '')
        setFormSecondStudentKana(student.second_student_name_kana || '')
        setFormSecondStudentGender(normalizeGender(student.second_student_gender))
        setFormSecondStudentBirthDate(student.second_student_birth_date || '')
        
        setStudentSearchOpen(false)
        setStudentSearchQuery(student.full_name || '')
    }

    const resetForm = () => {
        setFormStudentId('')
        setFormName('')
        setFormFullNameKana('')
        setFormGender('')
        setFormBirthDate('')
        setFormEmail('')
        setFormPhone('')
        setFormLineUserId('')
        setFormArea('')
        setFormLessonLocation('')
        setFormDatetime1('')
        setFormDatetime2('')
        setFormDatetime3('')
        setFormAvailableTimes('')
        setFormFrequency('')
        setFormSkillLevel('')
        setFormNotes('')
        setFormSecondStudentName('')
        setFormSecondStudentKana('')
        setFormSecondStudentGender('')
        setFormSecondStudentBirthDate('')
        setFormSendCustomerNotification(true)
        setStudentSearchQuery('')
    }

    const formatJapaneseDate = (dateStr: string) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return ''
        const weekdays = ['日', '月', '火', '水', '木', '金', '土']
        const m = date.getMonth() + 1
        const d = date.getDate()
        const w = weekdays[date.getDay()]
        return `${m}月${d}日(${w})`
    }

    const appendToDatetime = (num: 1 | 2 | 3, text: string) => {
        if (num === 1) setFormDatetime1(prev => (prev ? prev + ' ' : '') + text)
        if (num === 2) setFormDatetime2(prev => (prev ? prev + ' ' : '') + text)
        if (num === 3) setFormDatetime3(prev => (prev ? prev + ' ' : '') + text)
    }

    const appendToAvailableTimes = (text: string) => {
        setFormAvailableTimes(prev => (prev ? prev + ', ' : '') + text)
    }

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formName.trim()) {
            toast.error('名前を入力してください')
            return
        }

        setCreatingLead(true)
        try {
            const res = await createLeadManuallyAction({
                name: formName.trim(),
                full_name_kana: formFullNameKana.trim() || null,
                gender: formGender || null,
                birth_date: formBirthDate || null,
                email: formEmail.trim() || null,
                phone: formPhone.trim() || null,
                line_user_id: formLineUserId.trim() || null,
                area: formArea.trim() || null,
                lesson_location: formLessonLocation.trim() || null,
                datetime1: formDatetime1.trim() || null,
                datetime2: formDatetime2.trim() || null,
                datetime3: formDatetime3.trim() || null,
                available_times: formAvailableTimes.trim() || null,
                frequency: formFrequency.trim() || null,
                skill_level: formSkillLevel.trim() || null,
                notes: formNotes.trim() || null,
                second_student_name: formSecondStudentName.trim() || null,
                second_student_kana: formSecondStudentKana.trim() || null,
                second_student_gender: formSecondStudentGender || null,
                second_student_birth_date: formSecondStudentBirthDate || null,
                send_customer_notification: formSendCustomerNotification,
            })

            if (res.success) {
                toast.success('案件（リード）を手動作成しました')
                setIsCreateDialogOpen(false)
                resetForm()
                await fetchData()
            } else {
                toast.error(res.error || '作成に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setCreatingLead(false)
        }
    }

    const handleOpenEditDialog = (lead: any) => {
        setEditingLeadId(lead.id)
        setEditFormName(lead.name || '')
        setEditFormFullNameKana(lead.full_name_kana || '')
        setEditFormGender(lead.gender || '')
        setEditFormBirthDate(lead.birth_date || '')
        setEditFormEmail(lead.email || '')
        setEditFormPhone(lead.phone || '')
        setEditFormLineUserId(lead.line_user_id || '')
        setEditFormArea(lead.area || '')
        setEditFormLessonLocation(lead.lesson_location || '')
        setEditFormDatetime1(lead.datetime1 || '')
        setEditFormDatetime2(lead.datetime2 || '')
        setEditFormDatetime3(lead.datetime3 || '')
        setEditFormAvailableTimes(lead.available_times || '')
        setEditFormFrequency(lead.frequency || '')
        setEditFormSkillLevel(lead.skill_level || '')
        setEditFormNotes(lead.notes || '')
        setEditFormSecondStudentName(lead.second_student_name || '')
        setEditFormSecondStudentKana(lead.second_student_kana || '')
        setEditFormSecondStudentGender(lead.second_student_gender || '')
        setEditFormSecondStudentBirthDate(lead.second_student_birth_date || '')
        setEditFormSendCustomerNotification(lead.send_customer_notification !== false)
        setEditFormStatus(lead.status || '')
        setIsEditDialogOpen(true)
    }

    const resetEditForm = () => {
        setEditingLeadId(null)
        setEditFormName('')
        setEditFormFullNameKana('')
        setEditFormGender('')
        setEditFormBirthDate('')
        setEditFormEmail('')
        setEditFormPhone('')
        setEditFormLineUserId('')
        setEditFormArea('')
        setEditFormLessonLocation('')
        setEditFormDatetime1('')
        setEditFormDatetime2('')
        setEditFormDatetime3('')
        setEditFormAvailableTimes('')
        setEditFormFrequency('')
        setEditFormSkillLevel('')
        setEditFormNotes('')
        setEditFormSecondStudentName('')
        setEditFormSecondStudentKana('')
        setEditFormSecondStudentGender('')
        setEditFormSecondStudentBirthDate('')
        setEditFormSendCustomerNotification(true)
        setEditFormStatus('')
    }

    const handleUpdateLead = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingLeadId) return
        if (!editFormName.trim()) {
            toast.error('名前を入力してください')
            return
        }

        setUpdatingLead(true)
        try {
            const res = await updateLeadAction(editingLeadId, {
                name: editFormName.trim(),
                full_name_kana: editFormFullNameKana.trim() || null,
                gender: editFormGender || null,
                birth_date: editFormBirthDate || null,
                email: editFormEmail.trim() || null,
                phone: editFormPhone.trim() || null,
                line_user_id: editFormLineUserId.trim() || null,
                area: editFormArea.trim() || null,
                lesson_location: editFormLessonLocation.trim() || null,
                datetime1: editFormDatetime1.trim() || null,
                datetime2: editFormDatetime2.trim() || null,
                datetime3: editFormDatetime3.trim() || null,
                available_times: editFormAvailableTimes.trim() || null,
                frequency: editFormFrequency.trim() || null,
                skill_level: editFormSkillLevel.trim() || null,
                notes: editFormNotes.trim() || null,
                second_student_name: editFormSecondStudentName.trim() || null,
                second_student_kana: editFormSecondStudentKana.trim() || null,
                second_student_gender: editFormSecondStudentGender || null,
                second_student_birth_date: editFormSecondStudentBirthDate || null,
                send_customer_notification: editFormSendCustomerNotification,
                status: editFormStatus || null,
            })

            if (res.success) {
                toast.success('案件（リード）を更新しました')
                setIsEditDialogOpen(false)
                resetEditForm()
                await fetchData()
            } else {
                toast.error(res.error || '更新に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setUpdatingLead(false)
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            // 全てのリードを取得
            const { data: leadsData } = await supabase
                .from('leads')
                .select('*')
                .order('created_at', { ascending: false })

            // プロフィール一覧を取得してコーチ一覧として設定
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, role')
            if (profilesData) setCoaches(profilesData)

            // 施設マスタを取得
            const { data: facilitiesData } = await supabase
                .from('facilities')
                .select('id, name')
                .order('name', { ascending: true })

            // Webhookマスタを取得（全件）
            const { data: webhooksData } = await supabase
                .from('google_chat_webhooks')
                .select('*')
                .order('space_name', { ascending: true })

            // 既存生徒を取得
            const { data: studentsData } = await supabase
                .from('students')
                .select('*')
                .order('full_name', { ascending: true })
            if (studentsData) setStudents(studentsData)

            // テンプレートマスタを取得
            const templateRes = await getLeadNotificationTemplateAction()
            if (templateRes.success) {
                setNotificationTemplate(templateRes.value || '')
            }

            const assignedTemplateRes = await getLeadAssignedNotificationTemplateAction()
            if (assignedTemplateRes.success) {
                setAssignedNotificationTemplate(assignedTemplateRes.value || '')
            }

            const assignedWebhookUrlRes = await getLeadAssignedWebhookUrlAction()
            if (assignedWebhookUrlRes.success) {
                setAssignedWebhookUrl(assignedWebhookUrlRes.value || '')
            }

            const assignedAdditionalTemplateRes = await getLeadAssignedAdditionalWebhookTemplateAction()
            if (assignedAdditionalTemplateRes.success) {
                setAssignedAdditionalTemplate(assignedAdditionalTemplateRes.value || '')
            }

            // 表示設定を取得
            const settingsRes = await getDisplaySettingsAction()
            if (settingsRes.success) {
                setDisplaySettings(settingsRes.value)
            }

            // LINE設定を取得
            const lineConfigRes = await getLineConfigAction()
            if (lineConfigRes.success) {
                setLineToken(lineConfigRes.token || '')
                setLineTemplate(lineConfigRes.template || '')
            }

            if (leadsData) {
                setLeads(leadsData)
                // 初期値設定
                const locations: Record<string, string> = {}
                leadsData.forEach(l => {
                    locations[l.id] = l.lesson_location || ''
                })
                setSelectedLocations(locations)
            }
            if (facilitiesData) setFacilities(facilitiesData)
            if (webhooksData) {
                setWebhooks(webhooksData)
                
                // 有効なWebhookを抽出して初期値設定
                const activeWebhooks = webhooksData.filter(w => w.active)
                if (activeWebhooks.length > 0) {
                    const defaultWebhooks: Record<string, string> = {}
                    leadsData?.forEach(l => {
                        defaultWebhooks[l.id] = activeWebhooks[0].id
                    })
                    setSelectedWebhooks(defaultWebhooks)
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error)
            toast.error('データの取得に失敗しました')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveTemplate = async () => {
        setSavingTemplate(true)
        try {
            const res = await saveLeadNotificationTemplateAction(notificationTemplate)
            if (res.success) {
                toast.success('案件通知テンプレートを保存しました')
                await fetchData()
            } else {
                toast.error(res.error || '保存に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setSavingTemplate(false)
        }
    }

    const handleSaveAssignedTemplate = async () => {
        setSavingAssignedTemplate(true)
        try {
            const res = await saveLeadAssignedNotificationTemplateAction(assignedNotificationTemplate)
            if (res.success) {
                toast.success('アサイン確定通知テンプレートを保存しました')
                await fetchData()
            } else {
                toast.error(res.error || '保存に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setSavingAssignedTemplate(false)
        }
    }

    const handleSaveAssignedWebhookUrl = async () => {
        setSavingAssignedWebhookUrl(true)
        try {
            const res = await saveLeadAssignedWebhookUrlAction(assignedWebhookUrl)
            if (res.success) {
                toast.success('追加通知先Webhook URLを保存しました')
                await fetchData()
            } else {
                toast.error(res.error || '保存に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setSavingAssignedWebhookUrl(false)
        }
    }

    const handleSaveAssignedAdditionalTemplate = async () => {
        setSavingAssignedAdditionalTemplate(true)
        try {
            const res = await saveLeadAssignedAdditionalWebhookTemplateAction(assignedAdditionalTemplate)
            if (res.success) {
                toast.success('追加通知用テンプレートを保存しました')
                await fetchData()
            } else {
                toast.error(res.error || '保存に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setSavingAssignedAdditionalTemplate(false)
        }
    }

    const handleUpdateSetting = (key: string, value: 'show' | 'mask' | 'hide') => {
        setDisplaySettings(prev => ({
            ...prev,
            [key]: value
        }))
    }

    const handleSaveDisplaySettings = async () => {
        setSavingSettings(true)
        try {
            const res = await saveDisplaySettingsAction(displaySettings)
            if (res.success) {
                toast.success('表示設定を保存しました')
                await fetchData()
            } else {
                toast.error(res.error || '保存に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setSavingSettings(false)
        }
    }

    const handleSaveLineConfig = async () => {
        setSavingLineConfig(true)
        try {
            const res = await saveLineConfigAction(lineToken, lineTemplate)
            if (res.success) {
                toast.success('LINE通知設定を保存しました')
                await fetchData()
            } else {
                toast.error(res.error || '保存に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setSavingLineConfig(false)
        }
    }

    const handleCreateWebhook = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSpaceName.trim() || !newWebhookUrl.trim()) return

        setCreatingWebhook(true)
        try {
            const res = await createWebhookAction(newSpaceName.trim(), newWebhookUrl.trim())
            if (res.success) {
                toast.success('通知先スペース（Webhook）を追加しました')
                setNewSpaceName('')
                setNewWebhookUrl('')
                await fetchData()
            } else {
                toast.error(res.error || '追加に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        } finally {
            setCreatingWebhook(false)
        }
    }

    const handleDeleteWebhook = async (id: string) => {
        if (!confirm('この通知先スペース（Webhook）を削除してもよろしいですか？')) return

        try {
            const res = await deleteWebhookAction(id)
            if (res.success) {
                toast.success('通知先スペース（Webhook）を削除しました')
                await fetchData()
            } else {
                toast.error(res.error || '削除に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        }
    }

    const handleToggleWebhook = async (id: string, active: boolean) => {
        try {
            const res = await toggleWebhookAction(id, active)
            if (res.success) {
                toast.success(active ? '有効にしました' : '無効にしました')
                await fetchData()
            } else {
                toast.error(res.error || '更新に失敗しました')
            }
        } catch (error) {
            console.error(error)
            toast.error('エラーが発生しました')
        }
    }

    const handleSendNotification = async (leadId: string) => {
        const location = selectedLocations[leadId]?.trim()
        const webhookId = selectedWebhooks[leadId]

        if (!location) {
            toast.error('レッスン予定場所を入力または選択してください')
            return
        }

        if (!webhookId) {
            toast.error('通知先 Google Chat スペースを選択してください')
            return
        }

        setSendingStates(prev => ({ ...prev, [leadId]: true }))

        try {
            const res = await sendLeadNotificationAction(leadId, location, webhookId)
            if (res.success) {
                toast.success('Google Chatへ案件を通知しました')
                await fetchData() // リロードしてステータス更新を反映
            } else {
                toast.error(res.error || '通知の送信に失敗しました')
            }
        } catch (error) {
            toast.error('エラーが発生しました')
            console.error(error)
        } finally {
            setSendingStates(prev => ({ ...prev, [leadId]: false }))
        }
    }

    const handleCompleteManually = async (leadId: string) => {
        if (!confirm('この案件を手動で完了にしてもよろしいですか？\nリード一覧から非表示になります。')) return

        setCompletingStates(prev => ({ ...prev, [leadId]: true }))
        try {
            const res = await completeLeadManuallyAction(leadId)
            if (res.success) {
                toast.success('案件を完了にしました')
                await fetchData()
            } else {
                toast.error(res.error || '完了処理に失敗しました')
            }
        } catch (error) {
            toast.error('エラーが発生しました')
            console.error(error)
        } finally {
            setCompletingStates(prev => ({ ...prev, [leadId]: false }))
        }
    }

    const handleCancelAssignment = async (leadId: string) => {
        if (!confirm('この案件のアサインを解除してもよろしいですか？\n担当コーチの紐付けが解除され、生徒のステータスも「体験予定」に戻ります。')) return

        setCancelingStates(prev => ({ ...prev, [leadId]: true }))
        try {
            const res = await cancelLeadAssignmentAction(leadId)
            if (res.success) {
                toast.success('アサインを解除しました')
                await fetchData()
            } else {
                toast.error(res.error || 'アサイン解除に失敗しました')
            }
        } catch (error) {
            toast.error('エラーが発生しました')
            console.error(error)
        } finally {
            setCancelingStates(prev => ({ ...prev, [leadId]: false }))
        }
    }

    const maskUrl = (url: string) => {
        if (!url) return ''
        if (url.length <= 40) return '***'
        return `${url.substring(0, 35)}...${url.substring(url.length - 12)}`
    }

    const filteredLeads = leads.filter(lead => {
        if (statusFilter === 'unassigned') {
            return !lead.assigned_coach_id
        }
        if (statusFilter === 'assigned') {
            return !!lead.assigned_coach_id
        }
        return true
    })

    const activeWebhooks = webhooks.filter(w => w.active)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">体験申込リード管理</h1>
                    <p className="text-gray-500">新規申込案件のレッスン場所選定と通知スペース設定の管理</p>
                </div>
            </div>

            <Tabs defaultValue="leads" className="w-full">
                <TabsList className="flex w-full max-w-[950px] mb-6 bg-gray-100/80 p-1 rounded-lg">
                    <TabsTrigger value="leads" className="flex-1 text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
                        申込リード一覧
                    </TabsTrigger>
                    <TabsTrigger value="webhooks" className="flex-1 text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
                        通知先スペース（Webhook）設定
                    </TabsTrigger>
                    <TabsTrigger value="template" className="flex-1 text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
                        通知テンプレート設定
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-1 text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
                        案件表示設定
                    </TabsTrigger>
                    <TabsTrigger value="line" className="flex-1 text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-xs">
                        LINE通知設定
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="leads" className="outline-none space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-xs text-gray-500">
                                ※ レッスン場所を決定して「案件通知」を行ってください。
                            </p>
                            <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200/50">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('unassigned')}
                                    className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                        statusFilter === 'unassigned'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    未アサイン
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('assigned')}
                                    className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                        statusFilter === 'assigned'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    アサイン済み
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                        statusFilter === 'all'
                                            ? 'bg-white text-slate-900 shadow-xs'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    すべて
                                </button>
                            </div>
                        </div>
                        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                            setIsCreateDialogOpen(open)
                            if (!open) resetForm()
                        }}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="gap-1 text-xs font-semibold whitespace-nowrap">
                                    <Plus className="h-4 w-4" />
                                    手動で案件を作成
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>手動で案件（体験リード）を作成</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateLead} className="space-y-6 py-4">
                                    {/* 既存顧客の選択 */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-gray-700">対象顧客を選択（既存顧客の場合のみ。新規は空欄のまま手入力）</Label>
                                        <div className="relative">
                                            <Input
                                                placeholder="既存顧客から検索（名前・フリガナ）..."
                                                className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                value={studentSearchQuery}
                                                onChange={(e) => {
                                                    setStudentSearchQuery(e.target.value)
                                                    setStudentSearchOpen(true)
                                                }}
                                                onFocus={() => setStudentSearchOpen(true)}
                                            />
                                            {formStudentId && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-2 top-1.5 h-6 text-[10px] text-gray-500 hover:bg-gray-100"
                                                    onClick={() => {
                                                        resetForm()
                                                    }}
                                                >
                                                    選択解除
                                                </Button>
                                            )}
                                        </div>
                                        {studentSearchOpen && (
                                            <>
                                                <div 
                                                    className="fixed inset-0 z-40" 
                                                    onClick={() => setStudentSearchOpen(false)}
                                                />
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[200px] overflow-y-auto">
                                                    {students
                                                        .filter(s => {
                                                            const query = studentSearchQuery.toLowerCase().trim()
                                                            if (!query) return true
                                                            return (
                                                                s.full_name.toLowerCase().includes(query) ||
                                                                (s.full_name_kana && s.full_name_kana.toLowerCase().includes(query))
                                                            )
                                                        })
                                                        .map((student) => (
                                                            <div
                                                                key={student.id}
                                                                className="text-xs px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-b-0"
                                                                onClick={() => handleSelectStudent(student.id)}
                                                            >
                                                                <span className="font-semibold text-gray-800">{student.full_name}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">{student.full_name_kana || '-'}</span>
                                                            </div>
                                                        ))}
                                                    {students.filter(s => {
                                                        const query = studentSearchQuery.toLowerCase().trim()
                                                        if (!query) return true
                                                        return (
                                                            s.full_name.toLowerCase().includes(query) ||
                                                            (s.full_name_kana && s.full_name_kana.toLowerCase().includes(query))
                                                        )
                                                    }).length === 0 && (
                                                        <div className="text-xs text-gray-500 text-center py-4">
                                                            顧客が見つかりません
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* 基本情報 */}
                                    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/20 space-y-4">
                                        <h3 className="text-xs font-bold text-gray-800">基本情報（生徒情報）</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formName" className="text-xs font-semibold text-gray-700">氏名 <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    id="formName"
                                                    required
                                                    value={formName}
                                                    onChange={(e) => setFormName(e.target.value)}
                                                    placeholder="例: 山田 太郎"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formFullNameKana" className="text-xs font-semibold text-gray-700">フリガナ</Label>
                                                <Input
                                                    id="formFullNameKana"
                                                    value={formFullNameKana}
                                                    onChange={(e) => setFormFullNameKana(e.target.value)}
                                                    placeholder="例: ヤマダ タロウ"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formGender" className="text-xs font-semibold text-gray-700">性別</Label>
                                                <Select value={formGender} onValueChange={setFormGender}>
                                                    <SelectTrigger id="formGender" className="h-9 text-xs">
                                                        <SelectValue placeholder="性別を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="男" className="text-xs">男</SelectItem>
                                                        <SelectItem value="女" className="text-xs">女</SelectItem>
                                                        <SelectItem value="その他" className="text-xs">その他</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formBirthDate" className="text-xs font-semibold text-gray-700">生年月日</Label>
                                                <Input
                                                    id="formBirthDate"
                                                    type="date"
                                                    value={formBirthDate}
                                                    onChange={(e) => setFormBirthDate(e.target.value)}
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formEmail" className="text-xs font-semibold text-gray-700">メールアドレス</Label>
                                                <Input
                                                    id="formEmail"
                                                    type="email"
                                                    value={formEmail}
                                                    onChange={(e) => setFormEmail(e.target.value)}
                                                    placeholder="example@email.com"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formPhone" className="text-xs font-semibold text-gray-700">電話番号</Label>
                                                <Input
                                                    id="formPhone"
                                                    value={formPhone}
                                                    onChange={(e) => setFormPhone(e.target.value)}
                                                    placeholder="090-0000-0000"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5 md:col-span-2">
                                                <Label htmlFor="formLineUserId" className="text-xs font-semibold text-gray-700">LINE User ID (任意)</Label>
                                                <Input
                                                    id="formLineUserId"
                                                    value={formLineUserId}
                                                    onChange={(e) => setFormLineUserId(e.target.value)}
                                                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2人目の情報（ペアレッスン用） */}
                                    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/20 space-y-4">
                                        <h3 className="text-xs font-bold text-gray-800">2人目の情報（ペアレッスンの場合のみ入力）</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formSecondStudentName" className="text-xs font-semibold text-gray-700">2人目氏名</Label>
                                                <Input
                                                    id="formSecondStudentName"
                                                    value={formSecondStudentName}
                                                    onChange={(e) => setFormSecondStudentName(e.target.value)}
                                                    placeholder="例: 山田 次郎"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formSecondStudentKana" className="text-xs font-semibold text-gray-700">2人目フリガナ</Label>
                                                <Input
                                                    id="formSecondStudentKana"
                                                    value={formSecondStudentKana}
                                                    onChange={(e) => setFormSecondStudentKana(e.target.value)}
                                                    placeholder="例: ヤマダ ジロウ"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formSecondStudentGender" className="text-xs font-semibold text-gray-700">2人目性別</Label>
                                                <Select value={formSecondStudentGender} onValueChange={setFormSecondStudentGender}>
                                                    <SelectTrigger id="formSecondStudentGender" className="h-9 text-xs">
                                                        <SelectValue placeholder="性別を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="男" className="text-xs">男</SelectItem>
                                                        <SelectItem value="女" className="text-xs">女</SelectItem>
                                                        <SelectItem value="その他" className="text-xs">その他</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formSecondStudentBirthDate" className="text-xs font-semibold text-gray-700">2人目生年月日</Label>
                                                <Input
                                                    id="formSecondStudentBirthDate"
                                                    type="date"
                                                    value={formSecondStudentBirthDate}
                                                    onChange={(e) => setFormSecondStudentBirthDate(e.target.value)}
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 体験レッスン希望条件 */}
                                    <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/20 space-y-4">
                                        <h3 className="text-xs font-bold text-gray-800">体験レッスン希望条件</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formArea" className="text-xs font-semibold text-gray-700">希望エリア/最寄駅</Label>
                                                <Input
                                                    id="formArea"
                                                    value={formArea}
                                                    onChange={(e) => setFormArea(e.target.value)}
                                                    placeholder="例: 新宿駅、目黒区周辺"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold text-gray-700">レッスン予定場所の選定 (複数可)</Label>
                                                <Popover open={facilitySearchOpen} onOpenChange={setFacilitySearchOpen} modal={false}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-between h-9 text-xs bg-gray-50/50 border-gray-200">
                                                            <span className="truncate">{formLessonLocation || '施設を選択...'}</span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="施設を検索..." className="h-8 text-xs" />
                                                            <CommandList>
                                                                <CommandEmpty className="py-2 text-center text-xs text-gray-500">見つかりません</CommandEmpty>
                                                                <CommandGroup>
                                                                    {facilities.map((facility) => {
                                                                        const selectedList = formLessonLocation.split(',').map(s => s.trim()).filter(Boolean)
                                                                        const isChecked = selectedList.includes(facility.name)
                                                                        return (
                                                                            <CommandItem
                                                                                key={facility.id}
                                                                                value={facility.name}
                                                                                onSelect={() => {
                                                                                    let newList = [...selectedList]
                                                                                    if (isChecked) {
                                                                                        newList = newList.filter(n => n !== facility.name)
                                                                                    } else {
                                                                                        newList.push(facility.name)
                                                                                    }
                                                                                    setFormLessonLocation(newList.join(', '))
                                                                                }}
                                                                                className="text-xs flex items-center justify-between cursor-pointer py-1.5 px-2"
                                                                            >
                                                                                <span>{facility.name}</span>
                                                                                {isChecked && <span className="text-primary font-bold">✓</span>}
                                                                            </CommandItem>
                                                                        )
                                                                    })}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <Input
                                                    value={formLessonLocation}
                                                    onChange={(e) => setFormLessonLocation(e.target.value)}
                                                    placeholder="直接入力も可能です"
                                                    className="text-[11px] h-8 mt-1"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formFrequency" className="text-xs font-semibold text-gray-700">希望頻度</Label>
                                                <Input
                                                    id="formFrequency"
                                                    value={formFrequency}
                                                    onChange={(e) => setFormFrequency(e.target.value)}
                                                    placeholder="例: 月4回、単発"
                                                    className="text-xs h-9"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="formSkillLevel" className="text-xs font-semibold text-gray-700">泳力レベル・目標</Label>
                                                <Input
                                                    id="formSkillLevel"
                                                    value={formSkillLevel}
                                                    onChange={(e) => setFormSkillLevel(e.target.value)}
                                                    placeholder="例: クロールで25m泳げるようになりたい"
                                                    className="text-xs h-9"
                                                />
                                            </div>

                                            {/* 希望日時1 */}
                                            <div className="space-y-1.5 md:col-span-2 border-t pt-3 mt-1">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor="formDatetime1" className="text-xs font-bold text-gray-800">希望日時①</Label>
                                                    <div className="flex items-center gap-1.5">
                                                        <Input
                                                            type="date"
                                                            className="h-7 text-xs w-[130px] p-1 py-0.5"
                                                            onChange={(e) => {
                                                                const jDate = formatJapaneseDate(e.target.value)
                                                                if (jDate) appendToDatetime(1, jDate)
                                                                e.target.value = '' // リセットして再選択可能に
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-gray-400">←日付追加</span>
                                                    </div>
                                                </div>
                                                <Input
                                                    id="formDatetime1"
                                                    value={formDatetime1}
                                                    onChange={(e) => setFormDatetime1(e.target.value)}
                                                    placeholder="例: 6月20日(土) 10:00〜12:00"
                                                    className="text-xs h-9"
                                                />
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {['10:00〜12:00', '13:00〜15:00', '15:00〜17:00', '18:00〜20:00', '午前中', '午後'].map((t) => (
                                                        <Button
                                                            key={t}
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => appendToDatetime(1, t)}
                                                            className="h-5 text-[9px] px-1.5 text-gray-500 border-gray-200"
                                                        >
                                                            +{t}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 希望日時2 */}
                                            <div className="space-y-1.5 md:col-span-2 border-t pt-3">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor="formDatetime2" className="text-xs font-bold text-gray-800">希望日時②</Label>
                                                    <div className="flex items-center gap-1.5">
                                                        <Input
                                                            type="date"
                                                            className="h-7 text-xs w-[130px] p-1 py-0.5"
                                                            onChange={(e) => {
                                                                const jDate = formatJapaneseDate(e.target.value)
                                                                if (jDate) appendToDatetime(2, jDate)
                                                                e.target.value = ''
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-gray-400">←日付追加</span>
                                                    </div>
                                                </div>
                                                <Input
                                                    id="formDatetime2"
                                                    value={formDatetime2}
                                                    onChange={(e) => setFormDatetime2(e.target.value)}
                                                    placeholder="例: 6月21日(日) 13:00〜15:00"
                                                    className="text-xs h-9"
                                                />
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {['10:00〜12:00', '13:00〜15:00', '15:00〜17:00', '18:00〜20:00', '午前中', '午後'].map((t) => (
                                                        <Button
                                                            key={t}
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => appendToDatetime(2, t)}
                                                            className="h-5 text-[9px] px-1.5 text-gray-500 border-gray-200"
                                                        >
                                                            +{t}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 希望日時3 */}
                                            <div className="space-y-1.5 md:col-span-2 border-t pt-3">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor="formDatetime3" className="text-xs font-bold text-gray-800">希望日時③</Label>
                                                    <div className="flex items-center gap-1.5">
                                                        <Input
                                                            type="date"
                                                            className="h-7 text-xs w-[130px] p-1 py-0.5"
                                                            onChange={(e) => {
                                                                const jDate = formatJapaneseDate(e.target.value)
                                                                if (jDate) appendToDatetime(3, jDate)
                                                                e.target.value = ''
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-gray-400">←日付追加</span>
                                                    </div>
                                                </div>
                                                <Input
                                                    id="formDatetime3"
                                                    value={formDatetime3}
                                                    onChange={(e) => setFormDatetime3(e.target.value)}
                                                    placeholder="例: 6月24日(水) 18:00〜20:00"
                                                    className="text-xs h-9"
                                                />
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {['10:00〜12:00', '13:00〜15:00', '15:00〜17:00', '18:00〜20:00', '午前中', '午後'].map((t) => (
                                                        <Button
                                                            key={t}
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => appendToDatetime(3, t)}
                                                            className="h-5 text-[9px] px-1.5 text-gray-500 border-gray-200"
                                                        >
                                                            +{t}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 可能な曜日・時間帯 */}
                                            <div className="space-y-1.5 md:col-span-2 border-t pt-3">
                                                <Label htmlFor="formAvailableTimes" className="text-xs font-semibold text-gray-700">可能な曜日・時間帯 (自由入力可)</Label>
                                                <Textarea
                                                    id="formAvailableTimes"
                                                    value={formAvailableTimes}
                                                    onChange={(e) => setFormAvailableTimes(e.target.value)}
                                                    placeholder="例: 土日の午前中、平日の夜19時以降 など"
                                                    className="text-xs min-h-[60px]"
                                                />
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {['月曜', '火曜', '水曜', '木曜', '金曜', '土曜', '日曜', '平日', '土日祝', '午前', '午後', '夕方', '夜', '終日'].map((w) => (
                                                        <Button
                                                            key={w}
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => appendToAvailableTimes(w)}
                                                            className="h-5 text-[9px] px-1.5 text-gray-500 border-gray-200"
                                                        >
                                                            +{w}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* その他要望・メモ */}
                                            <div className="space-y-1.5 md:col-span-2 border-t pt-3">
                                                <Label htmlFor="formNotes" className="text-xs font-semibold text-gray-700">その他要望・メモ</Label>
                                                <Textarea
                                                    id="formNotes"
                                                    value={formNotes}
                                                    onChange={(e) => setFormNotes(e.target.value)}
                                                    placeholder="特記事項があれば入力してください"
                                                    className="text-xs min-h-[60px]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 顧客通知設定 */}
                                    <div className="flex items-center space-x-2 border-t pt-4">
                                        <Switch
                                            id="formSendCustomerNotification"
                                            checked={formSendCustomerNotification}
                                            onCheckedChange={setFormSendCustomerNotification}
                                        />
                                        <Label htmlFor="formSendCustomerNotification" className="text-xs font-semibold text-gray-700 cursor-pointer">
                                            アサイン確定時に顧客へ自動LINE通知を送信する（デフォルトON）
                                        </Label>
                                    </div>

                                    <DialogFooter className="border-t pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-9 px-4 font-semibold"
                                            onClick={() => setIsCreateDialogOpen(false)}
                                        >
                                            キャンセル
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={creatingLead}
                                            className="text-xs h-9 px-5 font-semibold"
                                        >
                                            {creatingLead ? '作成中...' : '案件を作成する'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>

                        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
                            setIsEditDialogOpen(open)
                            if (!open) resetEditForm()
                        }}>
                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>案件（体験リード）の編集</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleUpdateLead} className="space-y-6 py-4">
                                    {/* 基本情報 */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-900 border-b pb-1">基本情報</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editName" className="text-xs font-semibold text-gray-700">お名前 <span className="text-destructive">*</span></Label>
                                                <Input
                                                    id="editName"
                                                    placeholder="例: 山田 太郎"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormName}
                                                    onChange={(e) => setEditFormName(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editFullNameKana" className="text-xs font-semibold text-gray-700">フリガナ</Label>
                                                <Input
                                                    id="editFullNameKana"
                                                    placeholder="例: ヤマダ タロウ"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormFullNameKana}
                                                    onChange={(e) => setEditFormFullNameKana(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editGender" className="text-xs font-semibold text-gray-700">性別</Label>
                                                <Select value={editFormGender} onValueChange={setEditFormGender}>
                                                    <SelectTrigger id="editGender" className="text-xs h-9 bg-gray-50/50 border-gray-200">
                                                        <SelectValue placeholder="性別を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="男性" className="text-xs">男性</SelectItem>
                                                        <SelectItem value="女性" className="text-xs">女性</SelectItem>
                                                        <SelectItem value="その他" className="text-xs">その他</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editBirthDate" className="text-xs font-semibold text-gray-700">生年月日</Label>
                                                <Input
                                                    id="editBirthDate"
                                                    type="date"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormBirthDate}
                                                    onChange={(e) => setEditFormBirthDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editEmail" className="text-xs font-semibold text-gray-700">メールアドレス</Label>
                                                <Input
                                                    id="editEmail"
                                                    type="email"
                                                    placeholder="example@email.com"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormEmail}
                                                    onChange={(e) => setEditFormEmail(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editPhone" className="text-xs font-semibold text-gray-700">電話番号</Label>
                                                <Input
                                                    id="editPhone"
                                                    placeholder="090-1234-5678"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormPhone}
                                                    onChange={(e) => setEditFormPhone(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editLineUserId" className="text-xs font-semibold text-gray-700">LINE User ID</Label>
                                                <Input
                                                    id="editLineUserId"
                                                    placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormLineUserId}
                                                    onChange={(e) => setEditFormLineUserId(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editStatus" className="text-xs font-semibold text-gray-700">ステータス</Label>
                                                <Select value={editFormStatus} onValueChange={setEditFormStatus}>
                                                    <SelectTrigger id="editStatus" className="text-xs h-9 bg-gray-50/50 border-gray-200">
                                                        <SelectValue placeholder="ステータスを選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['新規', '募集開始', '体験確定', '手動完了', 'キャンセル'].map((status) => (
                                                            <SelectItem key={status} value={status} className="text-xs">
                                                                {status}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* レッスン希望条件 */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-900 border-b pb-1">レッスン希望条件</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editArea" className="text-xs font-semibold text-gray-700">希望エリア / 駅</Label>
                                                <Input
                                                    id="editArea"
                                                    placeholder="例: 新宿・渋谷"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormArea}
                                                    onChange={(e) => setEditFormArea(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editLessonLocation" className="text-xs font-semibold text-gray-700">希望レッスン場所</Label>
                                                <Input
                                                    id="editLessonLocation"
                                                    placeholder="例: ○○体育館プール"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormLessonLocation}
                                                    onChange={(e) => setEditFormLessonLocation(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editDatetime1" className="text-xs font-semibold text-gray-700">希望日時 ①</Label>
                                                <Input
                                                    id="editDatetime1"
                                                    placeholder="例: 6/20 10:00-11:00"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormDatetime1}
                                                    onChange={(e) => setEditFormDatetime1(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editDatetime2" className="text-xs font-semibold text-gray-700">希望日時 ②</Label>
                                                <Input
                                                    id="editDatetime2"
                                                    placeholder="例: 6/21 13:00-14:00"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormDatetime2}
                                                    onChange={(e) => setEditFormDatetime2(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editDatetime3" className="text-xs font-semibold text-gray-700">希望日時 ③</Label>
                                                <Input
                                                    id="editDatetime3"
                                                    placeholder="例: 6/22 15:00-16:00"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormDatetime3}
                                                    onChange={(e) => setEditFormDatetime3(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editAvailableTimes" className="text-xs font-semibold text-gray-700">対応可能時間帯（テキスト自由入力）</Label>
                                                <Input
                                                    id="editAvailableTimes"
                                                    placeholder="例: 土日祝終日、平日18時以降"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormAvailableTimes}
                                                    onChange={(e) => setEditFormAvailableTimes(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editFrequency" className="text-xs font-semibold text-gray-700">希望頻度</Label>
                                                <Input
                                                    id="editFrequency"
                                                    placeholder="例: 月2回、毎週水曜日など"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormFrequency}
                                                    onChange={(e) => setEditFormFrequency(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editSkillLevel" className="text-xs font-semibold text-gray-700">泳力レベル</Label>
                                                <Input
                                                    id="editSkillLevel"
                                                    placeholder="例: クロール25m完泳目標"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormSkillLevel}
                                                    onChange={(e) => setEditFormSkillLevel(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2人目の情報（ペアレッスン用） */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-900 border-b pb-1">2人目の情報（ペアレッスンの場合のみ入力）</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editSecondStudentName" className="text-xs font-semibold text-gray-700">2人目のお名前</Label>
                                                <Input
                                                    id="editSecondStudentName"
                                                    placeholder="例: 山田 花子"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormSecondStudentName}
                                                    onChange={(e) => setEditFormSecondStudentName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editSecondStudentKana" className="text-xs font-semibold text-gray-700">2人目のフリガナ</Label>
                                                <Input
                                                    id="editSecondStudentKana"
                                                    placeholder="例: ヤマダ ハナコ"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormSecondStudentKana}
                                                    onChange={(e) => setEditFormSecondStudentKana(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editSecondStudentGender" className="text-xs font-semibold text-gray-700">2人目の性別</Label>
                                                <Select value={editFormSecondStudentGender} onValueChange={setEditFormSecondStudentGender}>
                                                    <SelectTrigger id="editSecondStudentGender" className="text-xs h-9 bg-gray-50/50 border-gray-200">
                                                        <SelectValue placeholder="性別を選択" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="男性" className="text-xs">男性</SelectItem>
                                                        <SelectItem value="女性" className="text-xs">女性</SelectItem>
                                                        <SelectItem value="その他" className="text-xs">その他</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editSecondStudentBirthDate" className="text-xs font-semibold text-gray-700">2人目の生年月日</Label>
                                                <Input
                                                    id="editSecondStudentBirthDate"
                                                    type="date"
                                                    className="text-xs h-9 bg-gray-50/50 border-gray-200"
                                                    value={editFormSecondStudentBirthDate}
                                                    onChange={(e) => setEditFormSecondStudentBirthDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 特記事項・その他 */}
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-900 border-b pb-1">その他情報</h3>
                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="editNotes" className="text-xs font-semibold text-gray-700">特記事項 / ご要望 / 課題感</Label>
                                                <Textarea
                                                    id="editNotes"
                                                    value={editFormNotes}
                                                    onChange={(e) => setEditFormNotes(e.target.value)}
                                                    placeholder="特記事項があれば入力してください"
                                                    className="text-xs min-h-[60px]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 顧客通知設定 */}
                                    <div className="flex items-center space-x-2 border-t pt-4">
                                        <Switch
                                            id="editSendCustomerNotification"
                                            checked={editFormSendCustomerNotification}
                                            onCheckedChange={setEditFormSendCustomerNotification}
                                        />
                                        <Label htmlFor="editSendCustomerNotification" className="text-xs font-semibold text-gray-700 cursor-pointer">
                                            アサイン確定時に顧客へ自動LINE通知を送信する
                                        </Label>
                                    </div>

                                    <DialogFooter className="border-t pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-xs h-9 px-4 font-semibold"
                                            onClick={() => setIsEditDialogOpen(false)}
                                        >
                                            キャンセル
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            disabled={updatingLead}
                                            className="text-xs h-9 px-5 font-semibold"
                                        >
                                            {updatingLead ? '更新中...' : '案件を更新する'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="border rounded-lg bg-white shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[1170px] table-fixed">
                                <TableHeader className="bg-gray-50/70 border-b border-gray-100">
                                    <TableRow>
                                        <TableHead className="w-[180px] min-w-[180px]">顧客情報</TableHead>
                                        <TableHead className="w-[220px] min-w-[220px]">希望日時/エリア</TableHead>
                                        <TableHead className="w-[100px] min-w-[100px]">ステータス</TableHead>
                                        <TableHead className="w-[150px] min-w-[150px]">アサインコーチ</TableHead>
                                        <TableHead className="w-[240px] min-w-[240px]">レッスン予定場所の選定 (複数選択可)</TableHead>
                                        <TableHead className="w-[170px] min-w-[170px]">通知先スペース</TableHead>
                                        <TableHead className="text-right w-[140px] min-w-[140px]">アクション</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-xs text-gray-500">
                                                読み込み中...
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredLeads.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-gray-500 text-xs">
                                                体験申込リードはありません
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLeads.map((lead) => (
                                            <TableRow key={lead.id} className="hover:bg-gray-50/30 border-b border-gray-100 last:border-b-0">
                                                <TableCell className="align-middle whitespace-normal">
                                                    <div className="flex flex-col gap-0.5 w-[164px] min-w-[164px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-xs text-gray-950">{lead.name}</span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-gray-400 hover:text-primary rounded shrink-0"
                                                                onClick={() => handleOpenEditDialog(lead)}
                                                            >
                                                                <Pencil className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">{lead.full_name_kana || '-'}</span>
                                                        <span className="text-[10px] text-gray-500 mt-0.5">{lead.phone || '-'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-middle whitespace-normal">
                                                    <div className="text-[10px] space-y-1 w-[204px] min-w-[204px]">
                                                        <div className="flex items-center gap-1 text-gray-600">
                                                            <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                                                            <span className="truncate">エリア: {lead.area || '未設定'}</span>
                                                        </div>
                                                        <div className="text-gray-500 font-mono leading-relaxed">
                                                            ① {lead.datetime1 || '-'}<br />
                                                            ② {lead.datetime2 || '-'}<br />
                                                            ③ {lead.datetime3 || '-'}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-middle whitespace-normal">
                                                    <div className="w-[84px] min-w-[84px]">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                                                            lead.status === '新規' ? 'bg-green-50 text-green-700 border border-green-200/60' :
                                                            lead.status === '募集開始' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                                                            'bg-gray-50 text-gray-700 border border-gray-200/60'
                                                        }`}>
                                                            {lead.status}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-middle whitespace-normal">
                                                    <div className="w-[134px] min-w-[134px]">
                                                        {lead.assigned_coach_id ? (
                                                            (() => {
                                                                const coach = coaches.find(c => c.id === lead.assigned_coach_id)
                                                                if (!coach) return <span className="text-xs text-gray-400">不明</span>
                                                                return (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-semibold text-xs text-gray-950">
                                                                            {coach.full_name}
                                                                        </span>
                                                                        <span className="text-[9px] text-gray-400">
                                                                            {coach.role === 'admin' ? '管理者' : 'コーチ'}
                                                                        </span>
                                                                        {lead.confirmed_datetime && (
                                                                            <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 leading-normal" title="確定体験日時">
                                                                                確定: {lead.confirmed_datetime}
                                                                            </span>
                                                                        )}
                                                                        {lead.confirmed_location && (
                                                                            <span className="text-[10px] text-emerald-700 font-semibold leading-normal" title="確定体験場所">
                                                                                場所: {lead.confirmed_location}
                                                                            </span>
                                                                        )}
                                                                        <Button
                                                                            type="button"
                                                                            variant="link"
                                                                            className="text-[10px] text-rose-600 p-0 h-auto justify-start font-semibold mt-1 hover:text-rose-800"
                                                                            disabled={cancelingStates[lead.id]}
                                                                            onClick={() => handleCancelAssignment(lead.id)}
                                                                        >
                                                                            アサイン解除
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            })()
                                                        ) : (
                                                            <span className="text-xs text-gray-400">未アサイン</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-middle whitespace-normal">
                                                    <div className="w-[224px] min-w-[224px]">
                                                        <Popover 
                                                            open={openPopoverId === lead.id} 
                                                            onOpenChange={(open) => setOpenPopoverId(open ? lead.id : null)}
                                                        >
                                                            <PopoverTrigger asChild>
                                                                <div className="relative">
                                                                    <Input
                                                                        placeholder="場所を入力（候補から選択可）"
                                                                        className="h-8 text-xs bg-gray-50/50 border-gray-200 focus:bg-white pr-8 w-full"
                                                                        value={selectedLocations[lead.id] || ''}
                                                                        onChange={(e) => {
                                                                            setSelectedLocations(prev => ({ ...prev, [lead.id]: e.target.value }))
                                                                            if (openPopoverId !== lead.id) {
                                                                                setOpenPopoverId(lead.id)
                                                                            }
                                                                        }}
                                                                    />
                                                                    <MapPin className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                                                </div>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[224px] p-0" align="start">
                                                                <Command>
                                                                    <CommandInput 
                                                                        placeholder="施設を検索..." 
                                                                        className="h-8 text-xs"
                                                                    />
                                                                    <CommandList>
                                                                        <CommandEmpty className="py-2 text-center text-xs text-gray-500">
                                                                            見つかりません
                                                                        </CommandEmpty>
                                                                        <CommandGroup heading="施設候補" className="text-[10px]">
                                                                            {facilities.map((facility) => {
                                                                                const currentVal = selectedLocations[lead.id] || ''
                                                                                const selectedList = currentVal.split(',').map(s => s.trim()).filter(Boolean)
                                                                                const isChecked = selectedList.includes(facility.name)

                                                                                return (
                                                                                    <CommandItem
                                                                                        key={facility.id}
                                                                                        value={facility.name}
                                                                                        onSelect={() => {
                                                                                            let newList = [...selectedList]
                                                                                            if (isChecked) {
                                                                                                newList = newList.filter(name => name !== facility.name)
                                                                                            } else {
                                                                                                if (!newList.includes(facility.name)) {
                                                                                                    newList.push(facility.name)
                                                                                                }
                                                                                            }
                                                                                            const newVal = newList.join(', ')
                                                                                            setSelectedLocations(prev => ({ ...prev, [lead.id]: newVal }))
                                                                                        }}
                                                                                        className="text-xs flex items-center justify-between cursor-pointer py-1.5 px-2"
                                                                                    >
                                                                                        <span>{facility.name}</span>
                                                                                        {isChecked && (
                                                                                            <span className="text-primary text-[10px] font-bold">✓</span>
                                                                                        )}
                                                                                    </CommandItem>
                                                                                )
                                                                            })}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="align-middle whitespace-normal">
                                                     <div className="w-[154px] min-w-[154px]">
                                                         {activeWebhooks.length === 0 ? (
                                                             <div className="flex items-center gap-1 text-[11px] text-amber-600 font-medium bg-amber-50 border border-amber-200/50 rounded px-2 py-1 whitespace-nowrap">
                                                                 <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                                 <span>Webhook未設定</span>
                                                             </div>
                                                         ) : (
                                                             <Select
                                                                 value={selectedWebhooks[lead.id] || ''}
                                                                 onValueChange={(val) => setSelectedWebhooks(prev => ({ ...prev, [lead.id]: val }))}
                                                             >
                                                                 <SelectTrigger className="h-8 w-full text-xs bg-gray-50/50 border-gray-200">
                                                                     <SelectValue placeholder="スペースを選択" />
                                                                 </SelectTrigger>
                                                                 <SelectContent>
                                                                     {activeWebhooks.map((w) => (
                                                                         <SelectItem key={w.id} value={w.id} className="text-xs">
                                                                             {w.space_name}
                                                                         </SelectItem>
                                                                     ))}
                                                                 </SelectContent>
                                                             </Select>
                                                         )}
                                                     </div>
                                                 </TableCell>
                                                <TableCell className="text-right align-middle whitespace-normal">
                                                    <div className="w-[124px] min-w-[124px] inline-flex flex-col gap-1.5">
                                                        {/* 案件通知ボタン */}
                                                        <Button
                                                            size="sm"
                                                            className="h-8 w-full gap-1 text-xs font-medium whitespace-nowrap"
                                                            disabled={sendingStates[lead.id] || activeWebhooks.length === 0}
                                                            onClick={() => handleSendNotification(lead.id)}
                                                        >
                                                            <Send className="h-3 w-3" />
                                                            {lead.status === '募集開始' ? '再通知' : '案件通知'}
                                                        </Button>
                                                        {/* 手動完了ボタン */}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 w-full gap-1 text-xs font-medium whitespace-nowrap border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                            disabled={completingStates[lead.id]}
                                                            onClick={() => handleCompleteManually(lead.id)}
                                                        >
                                                            <CheckCircle className="h-3 w-3" />
                                                            手動完了
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="webhooks" className="outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 新規追加フォーム */}
                        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-gray-200 shadow-xs h-fit space-y-4">
                            <div>
                                <h2 className="text-sm font-bold text-gray-950">新規Webhook登録</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">Google ChatのWebhook通知先を登録します。</p>
                            </div>
                            
                            <form onSubmit={handleCreateWebhook} className="space-y-3.5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="spaceName" className="text-xs font-semibold text-gray-700">スペース名</Label>
                                    <Input
                                        id="spaceName"
                                        placeholder="例: レッスン案件周知用"
                                        value={newSpaceName}
                                        onChange={(e) => setNewSpaceName(e.target.value)}
                                        required
                                        className="text-xs h-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                                    />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <Label htmlFor="webhookUrl" className="text-xs font-semibold text-gray-700">Webhook URL</Label>
                                    <Input
                                        id="webhookUrl"
                                        type="url"
                                        placeholder="https://chat.googleapis.com/v1/spaces/..."
                                        value={newWebhookUrl}
                                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                                        required
                                        className="text-xs h-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                                    />
                                </div>
                                
                                <Button type="submit" size="sm" className="w-full text-xs h-9 gap-1 font-semibold mt-4 transition-colors" disabled={creatingWebhook}>
                                    <Plus className="h-3.5 w-3.5" />
                                    登録する
                                </Button>
                            </form>
                        </div>

                        {/* Webhookマスタ一覧テーブル */}
                        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[650px]">
                                    <TableHeader className="bg-gray-50/70 border-b border-gray-100">
                                        <TableRow>
                                            <TableHead className="w-[150px]">スペース名</TableHead>
                                            <TableHead>Webhook URL</TableHead>
                                            <TableHead className="w-[100px] text-center">有効/無効</TableHead>
                                            <TableHead className="w-[80px] text-right">操作</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-xs text-gray-500">
                                                    読み込み中...
                                                </TableCell>
                                            </TableRow>
                                        ) : webhooks.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-gray-500 text-xs">
                                                    登録されている通知スペースはありません
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            webhooks.map((w) => (
                                                <TableRow key={w.id} className="hover:bg-gray-50/30 border-b border-gray-100 last:border-b-0">
                                                    <TableCell className="font-semibold text-xs text-gray-950 align-middle">{w.space_name}</TableCell>
                                                    <TableCell className="font-mono text-[10px] text-gray-400 break-all select-all align-middle">
                                                        {maskUrl(w.webhook_url)}
                                                    </TableCell>
                                                    <TableCell className="text-center align-middle">
                                                        <div className="flex justify-center items-center">
                                                            <Switch
                                                                checked={w.active}
                                                                onCheckedChange={(checked) => handleToggleWebhook(w.id, checked)}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right align-middle">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50/50 transition-colors"
                                                            onClick={() => handleDeleteWebhook(w.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="template" className="outline-none">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-6 max-w-4xl">
                        <div>
                            <h2 className="text-sm font-bold text-gray-950">案件通知テンプレート設定</h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Google Chatへ案件を通知する際のメッセージ文面を設定します。プレースホルダー（<code>{"{{...}}"}</code>）は自動でリード情報に置換されます。
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="templateText" className="text-xs font-semibold text-gray-700">テンプレート本文</Label>
                                <textarea
                                    id="templateText"
                                    rows={15}
                                    value={notificationTemplate}
                                    onChange={(e) => setNotificationTemplate(e.target.value)}
                                    placeholder="テンプレートを入力してください..."
                                    className="w-full text-xs font-mono p-3 rounded-md border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                                />
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                                <h3 className="text-xs font-bold text-gray-800">利用可能なプレースホルダー</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{name}}"}</code>
                                        <span className="text-gray-500">顧客氏名</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{gender}}"}</code>
                                        <span className="text-gray-500">顧客性別</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{age}}"}</code>
                                        <span className="text-gray-500">顧客年齢（動的計算）</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{area}}"}</code>
                                        <span className="text-gray-500">希望エリア/駅</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{location}}"}</code>
                                        <span className="text-gray-500">レッスン予定場所</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{datetime1}}"}</code>
                                        <span className="text-gray-500">第1希望日時</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{datetime2}}"}</code>
                                        <span className="text-gray-500">第2希望日時</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{datetime3}}"}</code>
                                        <span className="text-gray-500">第3希望日時</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{skill_level}}"}</code>
                                        <span className="text-gray-500">泳力レベル</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{frequency}}"}</code>
                                        <span className="text-gray-500">希望頻度</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{notes}}"}</code>
                                        <span className="text-gray-500">その他メモ</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={handleSaveTemplate}
                                    disabled={savingTemplate}
                                    className="text-xs h-9 px-6 font-semibold"
                                >
                                    {savingTemplate ? '保存中...' : 'テンプレートを保存'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-6 max-w-4xl mt-6">
                        <div>
                            <h2 className="text-sm font-bold text-gray-950">アサイン確定通知テンプレート設定（Google Chat）</h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                コーチがアサイン確定された際に Google Chat へ送信する通知メッセージの文面を設定します。プレースホルダー（<code>{"{{...}}"}</code>）は自動で顧客情報に置換されます。
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="assignedTemplateText" className="text-xs font-semibold text-gray-700">テンプレート本文</Label>
                                <textarea
                                    id="assignedTemplateText"
                                    rows={10}
                                    value={assignedNotificationTemplate}
                                    onChange={(e) => setAssignedNotificationTemplate(e.target.value)}
                                    placeholder="テンプレートを入力してください..."
                                    className="w-full text-xs font-mono p-3 rounded-md border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                                />
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                                <h3 className="text-xs font-bold text-gray-800">利用可能なプレースホルダー</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{name}}"}</code>
                                        <span className="text-gray-500">顧客氏名</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{coach_name}}"}</code>
                                        <span className="text-gray-500">アサインコーチ氏名</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{confirmed_datetime}}"}</code>
                                        <span className="text-gray-500">確定体験日時</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{confirmed_location}}"}</code>
                                        <span className="text-gray-500">確定体験場所</span>
                                    </div>
                                    <div className="flex gap-1.5 items-start">
                                        <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{second_student_info}}"}</code>
                                        <span className="text-gray-500">2人目の名前（存在時のみ改行付きで出力）</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={handleSaveAssignedTemplate}
                                    disabled={savingAssignedTemplate}
                                    className="text-xs h-9 px-6 font-semibold"
                                >
                                    {savingAssignedTemplate ? '保存中...' : 'テンプレートを保存'}
                                </Button>
                            </div>

                            <div className="border-t pt-4 mt-4 space-y-3">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900">アサイン確定通知の追加送信先（指定Webhook）</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        元のスレッド返信とは別に、指定したWebhookへ新規メッセージ（スレッド指定なし）として同じアサイン確定通知を送信できます。
                                    </p>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1.5">
                                        <Label htmlFor="assignedWebhookUrl" className="text-xs font-semibold text-gray-700">追加送信先 Webhook URL</Label>
                                        <Input
                                            id="assignedWebhookUrl"
                                            type="url"
                                            placeholder="https://chat.googleapis.com/v1/spaces/..."
                                            value={assignedWebhookUrl}
                                            onChange={(e) => setAssignedWebhookUrl(e.target.value)}
                                            className="text-xs h-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSaveAssignedWebhookUrl}
                                        disabled={savingAssignedWebhookUrl}
                                        className="text-xs h-9 px-6 font-semibold shrink-0"
                                    >
                                        {savingAssignedWebhookUrl ? '保存中...' : 'Webhookを保存'}
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4 space-y-3">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-900">アサイン確定追加通知（追加送信先・指定Webhook）テンプレート設定</h3>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        追加送信先（指定Webhook）へ送信するアサイン確定メッセージの文面を設定します。未設定の場合は、上記のスレッド返信用テンプレートと同じ内容が送信されます。
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="assignedAdditionalTemplateText" className="text-xs font-semibold text-gray-700">追加通知用テンプレート本文</Label>
                                    <textarea
                                        id="assignedAdditionalTemplateText"
                                        rows={8}
                                        value={assignedAdditionalTemplate}
                                        onChange={(e) => setAssignedAdditionalTemplate(e.target.value)}
                                        placeholder="テンプレートを入力してください..."
                                        className="w-full text-xs font-mono p-3 rounded-md border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                                    />
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Button
                                        onClick={handleSaveAssignedAdditionalTemplate}
                                        disabled={savingAssignedAdditionalTemplate}
                                        className="text-xs h-9 px-6 font-semibold"
                                    >
                                        {savingAssignedAdditionalTemplate ? '保存中...' : '追加通知用テンプレートを保存'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="outline-none">
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-6 max-w-2xl">
                        <div>
                            <h2 className="text-sm font-bold text-gray-950">コーチページ案件表示設定</h2>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                コーチ用案件紹介ページ（/coach/leads）に表示される各項目の公開範囲（表示、一部伏せ字、非表示）を設定します。
                            </p>
                        </div>

                        <div className="border rounded-lg overflow-hidden bg-white shadow-xs">
                            <Table className="min-w-full">
                                <TableHeader className="bg-gray-50/70 border-b border-gray-100">
                                    <TableRow>
                                        <TableHead className="w-[180px] text-xs font-semibold text-gray-700">項目名</TableHead>
                                        <TableHead className="text-xs font-semibold text-gray-700">公開設定</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(itemLabels).map(([key, label]) => {
                                        const currentVal = displaySettings[key] || 'show'
                                        return (
                                            <TableRow key={key} className="hover:bg-gray-50/30 border-b border-gray-100 last:border-0">
                                                <TableCell className="align-middle py-3">
                                                    <span className="text-xs font-semibold text-gray-800">{label}</span>
                                                </TableCell>
                                                <TableCell className="align-middle py-2">
                                                    <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200/50">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateSetting(key, 'show')}
                                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                                                currentVal === 'show'
                                                                    ? 'bg-white text-slate-900 shadow-xs'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            表示
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateSetting(key, 'mask')}
                                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                                                currentVal === 'mask'
                                                                    ? 'bg-white text-slate-900 shadow-xs'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            隠して一部表示
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateSetting(key, 'hide')}
                                                            className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-all ${
                                                                currentVal === 'hide'
                                                                    ? 'bg-white text-rose-600 shadow-xs'
                                                                    : 'text-gray-400 hover:text-gray-600'
                                                            }`}
                                                        >
                                                            非表示
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleSaveDisplaySettings}
                                disabled={savingSettings}
                                className="text-xs h-9 px-6 font-semibold"
                            >
                                {savingSettings ? '保存中...' : '表示設定を保存'}
                            </Button>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="line" className="outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* 左：アクセストークン設定 */}
                        <div className="lg:col-span-1 bg-white p-5 rounded-lg border border-gray-200 shadow-xs h-fit space-y-4">
                            <div>
                                <h2 className="text-sm font-bold text-gray-950">LINE API設定</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">LINE Messaging APIの認証トークンを設定します。</p>
                            </div>
                            
                            <div className="space-y-3.5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="lineToken" className="text-xs font-semibold text-gray-700">チャンネルアクセストークン</Label>
                                    <div className="relative">
                                        <Input
                                            id="lineToken"
                                            type={showLineToken ? 'text' : 'password'}
                                            placeholder="LINE_CHANNEL_ACCESS_TOKEN"
                                            value={lineToken}
                                            onChange={(e) => setLineToken(e.target.value)}
                                            className="text-xs h-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowLineToken(!showLineToken)}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showLineToken ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-normal">
                                        ※ 設定されていない場合は環境変数（LINE_CHANNEL_ACCESS_TOKEN）が使用されます。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 右：メッセージテンプレート設定 */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-gray-200 shadow-xs space-y-6">
                            <div>
                                <h2 className="text-sm font-bold text-gray-950">コーチ確定時LINEテンプレート設定</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    コーチのアサインが確定した際に、顧客のLINEへ自動送信するメッセージ文面を設定します。
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="lineTemplateText" className="text-xs font-semibold text-gray-700">メッセージ本文</Label>
                                    <textarea
                                        id="lineTemplateText"
                                        rows={12}
                                        value={lineTemplate}
                                        onChange={(e) => setLineTemplate(e.target.value)}
                                        placeholder="テンプレートを入力してください..."
                                        className="w-full text-xs font-mono p-3 rounded-md border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                                    />
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 space-y-2">
                                    <h3 className="text-xs font-bold text-gray-800">利用可能なプレースホルダー</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-[11px]">
                                        <div className="flex gap-1.5 items-start">
                                            <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{name}}"}</code>
                                            <span className="text-gray-500">顧客氏名</span>
                                        </div>
                                        <div className="flex gap-1.5 items-start">
                                            <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{coach_name}}"}</code>
                                            <span className="text-gray-500">担当コーチ名</span>
                                        </div>
                                        <div className="flex gap-1.5 items-start">
                                            <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{lesson_date}}"}</code>
                                            <span className="text-gray-500">確定レッスン日時</span>
                                        </div>
                                        <div className="flex gap-1.5 items-start">
                                            <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{location}}"}</code>
                                            <span className="text-gray-500">レッスン場所</span>
                                        </div>
                                        <div className="flex gap-1.5 items-start">
                                            <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{second_student_info}}"}</code>
                                            <span className="text-gray-500">2人目の顧客情報</span>
                                        </div>
                                        <div className="flex gap-1.5 items-start">
                                            <code className="text-primary font-mono font-semibold bg-primary/5 px-1 rounded">{"{{coach_line_url}}"}</code>
                                            <span className="text-gray-500">コーチLINE追加URL</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={handleSaveLineConfig}
                                        disabled={savingLineConfig}
                                        className="text-xs h-9 px-6 font-semibold"
                                    >
                                        {savingLineConfig ? '保存中...' : 'LINE設定を保存'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}


