'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

interface Facility {
    id: string
    name: string
}

interface LocationSelectProps {
    value: string
    onChange: (value: string) => void
}

export function LocationSelect({ value, onChange }: LocationSelectProps) {
    const [open, setOpen] = useState(false)
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchFacilities = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('facilities')
                .select('id, name')
                .order('name', { ascending: true })

            if (data) setFacilities(data)
            setLoading(false)
        }
        fetchFacilities()
    }, [])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between",
                        !value && "text-muted-foreground"
                    )}
                    disabled={loading}
                >
                    {value
                        ? facilities.find((f) => f.name === value)?.name || value
                        : "施設を選択..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                    <CommandInput placeholder="施設を検索..." />
                    <CommandList>
                        <CommandEmpty>施設が見つかりません</CommandEmpty>
                        <CommandGroup>
                            {facilities.map((facility) => (
                                <CommandItem
                                    key={facility.id}
                                    value={facility.name}
                                    onSelect={(currentValue) => {
                                        onChange(currentValue === value ? "" : currentValue)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === facility.name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {facility.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
