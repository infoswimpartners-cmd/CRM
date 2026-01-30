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
    FileText,
    LogOut
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
    CommandShortcut,
} from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface GlobalSearchProps {
    students: {
        id: string
        full_name: string
        avatar_url: string | null
    }[]
    coaches?: {
        id: string
        full_name: string
        avatar_url: string | null
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
                className="h-12 w-full max-w-md justify-start gap-3 bg-white/80 backdrop-blur-xl border-white/50 text-base text-slate-600 placeholder:text-slate-400 hover:bg-white hover:text-cyan-900 hover:border-cyan-200 px-4 rounded-2xl shadow-sm transition-all duration-300 group ring-1 ring-slate-200/50 hover:ring-cyan-400/30 hover:shadow-md"
                onClick={() => setOpen(true)}
            >
                <Search className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-cyan-500 transition-colors duration-300" />
                <span className="font-medium opacity-70 group-hover:opacity-100 transition-opacity truncate flex-1 text-left">検索...</span>
                <kbd className="hidden h-6 select-none items-center gap-1 rounded bg-slate-100/80 px-2 font-mono text-[10px] font-medium text-slate-500 opacity-70 group-hover:opacity-100 transition-opacity sm:flex border border-slate-200 ml-auto">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <div className="flex items-center border-b border-slate-100 bg-white/50 px-5 py-4">
                    <Search className="mr-4 h-5 w-5 shrink-0 text-slate-400 opacity-70" />
                    <CommandPrimitive.Input
                        placeholder="何をお探しですか？..."
                        className="flex-1 bg-transparent text-lg outline-none placeholder:text-slate-400 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 selection:bg-cyan-100 selection:text-cyan-900"
                    />
                </div>
                <CommandList className="max-h-[500px] p-2 bg-white/80 backdrop-blur-xl">
                    <CommandEmpty className="py-10 text-center text-slate-500">
                        <div className="flex justify-center mb-4">
                            <Search className="h-10 w-10 text-slate-300 opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-slate-600">結果が見つかりませんでした</p>
                        <p className="text-sm">キーワードを変えて再度お試しください</p>
                    </CommandEmpty>

                    <CommandGroup heading="ページ移動" className="text-slate-500">
                        <CommandItem onSelect={() => runCommand(() => router.push(isAdmin ? '/admin' : '/coach'))} className="py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                            <LayoutDashboard className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                            <span className="font-medium">ダッシュボード</span>
                        </CommandItem>
                        {isAdmin ? (
                            <>
                                <CommandItem onSelect={() => runCommand(() => router.push('/admin/analytics'))} className="group py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                                    <CreditCard className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                                    <span className="font-medium">売上・分析</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push('/customers'))} className="group py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                                    <Users className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                                    <span className="font-medium">会員管理</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push('/admin/coaches'))} className="group py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                                    <User className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                                    <span className="font-medium">コーチ管理</span>
                                </CommandItem>
                            </>
                        ) : (
                            <>
                                <CommandItem onSelect={() => runCommand(() => router.push('/students'))} className="group py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                                    <Users className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                                    <span className="font-medium">生徒一覧</span>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => router.push('/finance'))} className="group py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                                    <CreditCard className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                                    <span className="font-medium">売上確認</span>
                                </CommandItem>
                            </>
                        )}
                        <CommandItem onSelect={() => runCommand(() => router.push('/coach/schedule'))} className="group py-3 px-4 rounded-xl aria-selected:bg-cyan-50 aria-selected:text-cyan-900 cursor-pointer transition-colors mb-1">
                            <Calendar className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-cyan-500" />
                            <span className="font-medium">スケジュール</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator className="my-2 bg-slate-100" />

                    <CommandGroup heading="アクション" className="text-slate-500">
                        <CommandItem onSelect={() => runCommand(() => router.push('/coach/report'))} className="group py-3 px-4 rounded-xl aria-selected:bg-orange-50 aria-selected:text-orange-900 cursor-pointer transition-colors mb-1">
                            <PlusCircle className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-orange-500" />
                            <span className="font-medium">新規レポート作成</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push(isAdmin ? '/customers/new' : '/students/new'))} className="group py-3 px-4 rounded-xl aria-selected:bg-emerald-50 aria-selected:text-emerald-900 cursor-pointer transition-colors mb-1">
                            <User className="mr-3 h-5 w-5 text-slate-400 group-aria-selected:text-emerald-500" />
                            <span className="font-medium">新規生徒登録</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator className="my-2 bg-slate-100" />

                    <CommandGroup heading="生徒" className="text-slate-500">
                        {students.slice(0, 10).map((student) => (
                            <CommandItem
                                key={student.id}
                                onSelect={() => runCommand(() => router.push(isAdmin ? `/customers/${student.id}` : `/students/${student.id}`))}
                                value={student.full_name}
                                className="group py-2 px-3 rounded-lg aria-selected:bg-blue-50 aria-selected:text-blue-900 cursor-pointer transition-colors mb-1"
                            >
                                <Avatar className="mr-3 h-8 w-8 border border-white shadow-sm">
                                    <AvatarImage src={student.avatar_url || undefined} />
                                    <AvatarFallback className="bg-blue-100 text-blue-700">{student.full_name[0]}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{student.full_name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    {isAdmin && coaches.length > 0 && (
                        <>
                            <CommandSeparator className="my-2 bg-slate-100" />
                            <CommandGroup heading="コーチ" className="text-slate-500">
                                {coaches.map((coach) => (
                                    <CommandItem
                                        key={coach.id}
                                        onSelect={() => runCommand(() => router.push(`/admin/coaches/${coach.id}`))}
                                        value={coach.full_name}
                                        className="group py-2 px-3 rounded-lg aria-selected:bg-purple-50 aria-selected:text-purple-900 cursor-pointer transition-colors mb-1"
                                    >
                                        <Avatar className="mr-3 h-8 w-8 border border-white shadow-sm">
                                            <AvatarImage src={coach.avatar_url || undefined} />
                                            <AvatarFallback className="bg-purple-100 text-purple-700">{coach.full_name[0]}</AvatarFallback>
                                        </Avatar>
                                        <span className="font-medium">{coach.full_name}</span>
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
