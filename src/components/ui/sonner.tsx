"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps, toast } from "sonner"
import { sanitizeErrorMessage } from "@/lib/error-formatter"

// Next.js本番ビルドでのServer Components renderマスクエラー表示を完全に防ぐグローバル・インターセプター
if (typeof window !== "undefined" && toast && typeof toast.error === "function") {
  const originalToastError = toast.error.bind(toast)
  if (!(toast.error as any).__isSanitized) {
    const interceptedToastError = (message: any, data?: any) => {
      const safeMessage = sanitizeErrorMessage(message)
      return originalToastError(safeMessage, data)
    }
    interceptedToastError.__isSanitized = true
    toast.error = interceptedToastError as any
  }
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster, toast }
