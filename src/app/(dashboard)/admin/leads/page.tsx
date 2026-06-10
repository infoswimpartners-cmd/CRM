'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, Send, MapPin, AlertCircle, Plus, Trash2, Eye, EyeOff, CheckCircle } from 'lucide-react'
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
    getDisplaySettingsAction,
    saveDisplaySettingsAction,
    getLineConfigAction,
    saveLineConfigAction,
    completeLeadManuallyAction
} from '@/actions/leads'

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

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [webhooks, setWebhooks] = useState<Webhook[]>([])
    const [loading, setLoading] = useState(true)

    // 各リードごとの設定状態
    const [selectedLocations, setSelectedLocations] = useState<Record<string, string>>({})
    const [selectedWebhooks, setSelectedWebhooks] = useState<Record<string, string>>({})
    const [sendingStates, setSendingStates] = useState<Record<string, boolean>>({})
    const [completingStates, setCompletingStates] = useState<Record<string, boolean>>({})

    // 新規Webhook追加用フォームのステート
    const [newSpaceName, setNewSpaceName] = useState('')
    const [newWebhookUrl, setNewWebhookUrl] = useState('')
    const [creatingWebhook, setCreatingWebhook] = useState(false)

    // ポップオーバーの開閉制御
    const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

    // テンプレート設定のステート
    const [notificationTemplate, setNotificationTemplate] = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)

    // 表示設定のステート
    const [displaySettings, setDisplaySettings] = useState<Record<string, string>>({})
    const [savingSettings, setSavingSettings] = useState(false)

    // LINE通知設定のステート
    const [lineToken, setLineToken] = useState('')
    const [lineTemplate, setLineTemplate] = useState('')
    const [savingLineConfig, setSavingLineConfig] = useState(false)
    const [showLineToken, setShowLineToken] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            // アサイン前のリードを取得
            const { data: leadsData } = await supabase
                .from('leads')
                .select('*')
                .is('assigned_coach_id', null)
                .order('created_at', { ascending: false })

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

            // テンプレートマスタを取得
            const templateRes = await getLeadNotificationTemplateAction()
            if (templateRes.success) {
                setNotificationTemplate(templateRes.value || '')
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

    const maskUrl = (url: string) => {
        if (!url) return ''
        if (url.length <= 40) return '***'
        return `${url.substring(0, 35)}...${url.substring(url.length - 12)}`
    }

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
                    <div className="border rounded-lg bg-white shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="min-w-[1020px] table-fixed">
                                <TableHeader className="bg-gray-50/70 border-b border-gray-100">
                                    <TableRow>
                                        <TableHead className="w-[180px] min-w-[180px]">顧客情報</TableHead>
                                        <TableHead className="w-[220px] min-w-[220px]">希望日時/エリア</TableHead>
                                        <TableHead className="w-[100px] min-w-[100px]">ステータス</TableHead>
                                        <TableHead className="w-[240px] min-w-[240px]">レッスン予定場所の選定 (複数選択可)</TableHead>
                                        <TableHead className="w-[170px] min-w-[170px]">通知先スペース</TableHead>
                                        <TableHead className="text-right w-[140px] min-w-[140px]">アクション</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-xs text-gray-500">
                                                読み込み中...
                                            </TableCell>
                                        </TableRow>
                                    ) : leads.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-gray-500 text-xs">
                                                未対応の体験申込リードはありません
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        leads.map((lead) => (
                                            <TableRow key={lead.id} className="hover:bg-gray-50/30 border-b border-gray-100 last:border-b-0">
                                                <TableCell className="align-middle whitespace-normal">
                                                    <div className="flex flex-col gap-0.5 w-[164px] min-w-[164px]">
                                                        <span className="font-semibold text-xs text-gray-950">{lead.name}</span>
                                                        <span className="text-[10px] text-gray-400">{lead.full_name_kana || '-'}</span>
                                                        <span className="text-[10px] text-gray-500 mt-1">{lead.phone || '-'}</span>
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


