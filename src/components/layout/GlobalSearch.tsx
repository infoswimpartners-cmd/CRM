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
    ShieldCheck
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
        avatar_url: string | null
        student_number?: string | null
    }[]
    coaches?: {
        id: string
        full_name: string
        avatar_url: string | null
        coach_number?: string | null
    }[]
    isAdmin: boolean
}

export function GlobalSearch({ students, coaches = [], isAdmin }: GlobalSearchProps) {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

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
                <CommandInput placeholder="名前、ID、ページ名で検索..." />
                <CommandList className="max-h-[450px]">
                    <CommandEmpty>結果が見つかりませんでした。</CommandEmpty>

                    <CommandGroup heading="クイックアクセス">
                        <CommandItem onSelect={() => runCommand(() => router.push(isAdmin ? '/admin' : '/coach'))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>ダッシュボード</span>
                        </CommandItem>
                        {isAdmin ? (
                            <>
                                <CommandItem onSelect={() => runCommand(() => router.push('/admin/analytics'))}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    <span>売上・分析</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push('/customers'))}>
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>会員管理</span>
                                </CommandItem>
                            </>
                        ) : (
                            <>
                                <CommandItem onSelect={() => runCommand(() => router.push('/students'))}>
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>生徒一覧</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push('/finance'))}>
                                    <CreditCard className="mr-2 h-4 w-4" />
                                    <span>売上確認</span>
                                </CommandItem>
                            </>
                        )}
                        <CommandItem onSelect={() => runCommand(() => router.push('/coach/schedule'))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>スケジュール</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="生徒・顧客">
                        {students.map((student) => (
                            <CommandItem
                                key={student.id}
                                onSelect={() => runCommand(() => router.push(isAdmin ? `/customers/${student.id}` : `/students/${student.id}`))}
                                value={`${student.full_name} ${student.student_number || ''}`}
                            >
                                <Avatar className="mr-2 h-6 w-6">
                                    <AvatarImage src={student.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px] bg-slate-100">
                                        {student.full_name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className="font-medium">{student.full_name}</span>
                                    {student.student_number && (
                                        <span className="text-[10px] text-slate-400 font-mono">#{student.student_number}</span>
                                    )}
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>

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
