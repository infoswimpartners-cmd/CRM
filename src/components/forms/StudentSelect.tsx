'use client'

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from '@/lib/supabase/client'
import { Badge } from "@/components/ui/badge"

interface Student {
    id: string
    full_name: string
    full_name_kana: string | null
}

interface StudentSelectProps {
    onSelect: (studentId: string | null, studentName: string) => void
    selectedName?: string
    coachId?: string
}

export function StudentSelect({ onSelect, selectedName, coachId }: StudentSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [students, setStudents] = React.useState<Student[]>([])
    const [search, setSearch] = React.useState("")

    React.useEffect(() => {
        const fetchStudents = async () => {
            const supabase = createClient()
            let query = supabase.from('students').select('id, full_name, full_name_kana').order('full_name')

            if (coachId) {
                query = query.eq('coach_id', coachId)
            }

            const { data } = await query
            if (data) setStudents(data)
        }
        fetchStudents()
    }, [coachId])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedName || "生徒を選択または検索..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="名前で検索..." value={search} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-4 text-sm text-center">
                                見つかりません。<br />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => {
                                        onSelect(null, search)
                                        setOpen(false)
                                    }}
                                >
                                    "{search}" を使用する
                                </Button>
                            </div>
                        </CommandEmpty>
                        <CommandGroup heading="登録済み生徒">
                            {students.map((student) => (
                                <CommandItem
                                    key={student.id}
                                    value={student.full_name}
                                    onSelect={() => {
                                        onSelect(student.id, student.full_name)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedName === student.full_name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{student.full_name}</span>
                                        {student.full_name_kana && <span className="text-xs text-muted-foreground">{student.full_name_kana}</span>}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
