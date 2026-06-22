"use client"

import * as React from "react"
import {
    Calendar,
    CreditCard,
    LayoutDashboard,
    Settings,
    User,
    Users,
    Search,
    PlusCircle,
    LogOut,
    ShieldCheck,
    DollarSign,
    FileCheck,
    UserPlus,
    Crown,
    History,
    Megaphone,
    Mail,
    BookOpen
} from "lucide-react"
import { useRouter } from "next/navigation"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface GlobalSearchProps {
    students: {
        id: string
        full_name: string
        full_name_kana?: string | null
        avatar_url: string | null
        student_number?: string | null
        contact_email?: string | null
        contact_phone?: string | null
    }[]
    coaches?: {
        id: string
        full_name: string
        avatar_url: string | null
        coach_number?: string | null
    }[]
    leads?: {
        id: string
        name: string | null
        full_name_kana: string | null
        email: string | null
        phone: string | null
    }[]
    announcements?: {
        id: string
        title: string
        content: string | null
        published_at?: string | null
    }[]
    isAdmin: boolean
}

export function GlobalSearch({ students, coaches = [], leads = [], announcements = [], isAdmin }: GlobalSearchProps) {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    const pages = React.useMemo(() => {
        if (isAdmin) {
            return [
                { title: "ダッシュボード", path: "/admin", icon: LayoutDashboard },
                { title: "分析・集計", path: "/admin/analytics", icon: DollarSign },
                { title: "全レッスン報告", path: "/admin/reports", icon: Calendar },
                { title: "報酬支払管理", path: "/admin/finance/payouts", icon: CreditCard },
                { title: "請求・決済管理", path: "/admin/approvals", icon: FileCheck },
                { title: "体験申込リード管理", path: "/admin/leads", icon: UserPlus },
                { title: "全体スケジュール", path: "/admin/schedule", icon: Calendar },
                { title: "会員管理", path: "/customers", icon: Users },
                { title: "TRIO管理", path: "/admin/trio", icon: Crown },
                { title: "コーチ管理", path: "/admin/coaches", icon: User },
                { title: "レッスン履歴", path: "/coach/history", icon: History },
                { title: "レッスン報告", path: "/coach/report", icon: PlusCircle },
                { title: "マスタ設定", path: "/admin/masters", icon: Settings },
                { title: "お知らせ管理", path: "/admin/announcements", icon: Megaphone },
                { title: "メール設定", path: "/admin/email-templates", icon: Mail },
                { title: "全体設定", path: "/admin/settings", icon: Settings },
                { title: "管理者マニュアル", path: "/admin/manual", icon: BookOpen },
                { title: "コーチマニュアル", path: "/coach/manual", icon: BookOpen },
            ]
        } else {
            return [
                { title: "ダッシュボード", path: "/coach", icon: LayoutDashboard },
                { title: "生徒一覧", path: "/students", icon: Users },
                { title: "案件紹介一覧", path: "/coach/leads", icon: UserPlus },
                { title: "スケジュール管理", path: "/coach/schedule", icon: Calendar },
                { title: "レッスン履歴", path: "/coach/history", icon: History },
                { title: "レッスン報告", path: "/coach/report", icon: PlusCircle },
                { title: "支払い通知書一覧", path: "/finance", icon: DollarSign },
                { title: "アカウント設定", path: "/settings", icon: Settings },
                { title: "コーチマニュアル", path: "/coach/manual", icon: BookOpen },
            ]
        }
    }, [isAdmin])

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <Button
                variant="outline"
                className="h-10 w-full max-w-md justify-start gap-3 bg-white/40 backdrop-blur-md border-white/20 text-sm text-slate-600 hover:bg-white/60 hover:text-cyan-900 px-4 rounded-xl shadow-none transition-all duration-300 group"
                onClick={() => setOpen(true)}
            >
                <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                <span className="font-medium opacity-70 group-hover:opacity-100 transition-opacity">検索...</span>
                <kbd className="hidden h-5 select-none items-center gap-1 rounded bg-slate-200/50 px-1.5 font-mono text-[10px] font-medium text-slate-500 sm:flex ml-auto border border-slate-300/30">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="名前、ID、ページ名、お知らせで検索..." />
                <CommandList className="max-h-[450px]">
                    <CommandEmpty>結果が見つかりませんでした。</CommandEmpty>

                    <CommandGroup heading="ページ・機能">
                        {pages.map((page) => (
                            <CommandItem
                                key={page.path}
                                onSelect={() => runCommand(() => router.push(page.path))}
                                value={page.title}
                            >
                                <page.icon className="mr-2 h-4 w-4 text-slate-500" />
                                <span>{page.title}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    {announcements.length > 0 && (
                        <>
                            <CommandGroup heading="お知らせ">
                                {announcements.map((announcement) => (
                                    <CommandItem
                                        key={announcement.id}
                                        onSelect={() => runCommand(() => {
                                            const targetUrl = isAdmin
                                                ? `/admin/announcements/${announcement.id}/edit`
                                                : `/coach?announcementId=${announcement.id}`
                                            router.push(targetUrl)
                                        })}
                                        value={`${announcement.title} ${announcement.content || ''}`}
                                    >
                                        <Megaphone className="mr-2 h-4 w-4 text-blue-500 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium truncate">{announcement.title}</span>
                                            {announcement.content && (
                                                <span className="text-[10px] text-slate-400 line-clamp-1 truncate">
                                                    {announcement.content}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                        </>
                    )}

                    <CommandGroup heading="生徒・既存顧客">
                        {students.map((student) => (
                            <CommandItem
                                key={student.id}
                                onSelect={() => runCommand(() => router.push(isAdmin ? `/customers/${student.id}` : `/students/${student.id}`))}
                                value={`${student.full_name} ${student.full_name_kana || ''} ${student.student_number || ''} ${student.contact_email || ''} ${student.contact_phone || ''}`}
                            >
                                <Avatar className="mr-2 h-6 w-6">
                                    <AvatarImage src={student.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px] bg-slate-100">
                                        {student.full_name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-medium truncate flex items-center gap-2">
                                        {student.full_name}
                                        {student.full_name_kana && (
                                            <span className="text-[10px] text-slate-400 font-normal">({student.full_name_kana})</span>
                                        )}
                                    </span>
                                    <div className="flex gap-2 text-[10px] text-slate-400">
                                        {student.student_number && <span className="font-mono">#{student.student_number}</span>}
                                        {student.contact_phone && <span>{student.contact_phone}</span>}
                                    </div>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    {leads.length > 0 && (
                        <>
                            <CommandGroup heading="体験申込リード（見込み顧客）">
                                {leads.map((lead) => (
                                    <CommandItem
                                        key={lead.id}
                                        onSelect={() => runCommand(() => router.push(isAdmin ? `/admin/leads?search=${encodeURIComponent(lead.name || '')}` : `/coach/leads`))}
                                        value={`${lead.name || ''} ${lead.full_name_kana || ''} ${lead.email || ''} ${lead.phone || ''}`}
                                    >
                                        <UserPlus className="mr-2 h-4 w-4 text-emerald-500 shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium truncate flex items-center gap-2">
                                                {lead.name || '名前未設定'}
                                                {lead.full_name_kana && (
                                                    <span className="text-[10px] text-slate-400 font-normal">({lead.full_name_kana})</span>
                                                )}
                                            </span>
                                            {(lead.email || lead.phone) && (
                                                <span className="text-[10px] text-slate-400 truncate">
                                                    {[lead.phone, lead.email].filter(Boolean).join(' | ')}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                            <CommandSeparator />
                        </>
                    )}

                    {isAdmin && coaches.length > 0 && (
                        <>
                            <CommandSeparator />
                            <CommandGroup heading="コーチ・スタッフ">
                                {coaches.map((coach) => (
                                    <CommandItem
                                        key={coach.id}
                                        onSelect={() => runCommand(() => router.push(`/admin/coaches/${coach.id}`))}
                                        value={`${coach.full_name} ${coach.coach_number || ''}`}
                                    >
                                        <Avatar className="mr-2 h-6 w-6">
                                            <AvatarImage src={coach.avatar_url || undefined} />
                                            <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-700">
                                                {coach.full_name[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium flex items-center gap-1">
                                                {coach.full_name}
                                                <ShieldCheck className="h-3 w-3 text-indigo-500" />
                                            </span>
                                            {coach.coach_number && (
                                                <span className="text-[10px] text-slate-400 font-mono">ID: {coach.coach_number}</span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    )
}
