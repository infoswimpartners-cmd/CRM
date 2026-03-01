"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2 } from "lucide-react"
import { unlinkLineUser } from "@/actions/line-link"
import { toast } from "sonner"

interface UnlinkLineButtonProps {
    studentId: string
}

export function UnlinkLineButton({ studentId }: UnlinkLineButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleUnlink = async () => {
        if (!confirm("ユーザーのLINE連携を解除します。よろしいですか？\n（解除した場合、お客様はマイページから再度連携する必要があります）")) {
            return
        }

        setIsLoading(true)
        try {
            const res = await unlinkLineUser(studentId)
            if (res.success) {
                toast.success("LINE連携を解除しました")
            } else {
                toast.error(res.error || "連携の解除に失敗しました")
            }
        } catch (e) {
            toast.error("エラーが発生しました")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            variant="destructive"
            size="sm"
            onClick={handleUnlink}
            disabled={isLoading}
            className="w-full text-xs"
        >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
            連携を解除する
        </Button>
    )
}
