'use client'

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import { BarChart3, List } from "lucide-react"

interface AdminDashboardTabsProps {
    performanceContent: React.ReactNode
    historyContent: React.ReactNode
}

export function AdminDashboardTabs({ performanceContent, historyContent }: AdminDashboardTabsProps) {
    return (
        <Tabs defaultValue="performance" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="performance" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    売上・報酬管理
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    レッスン履歴
                </TabsTrigger>
            </TabsList>
            <TabsContent value="performance">
                {performanceContent}
            </TabsContent>
            <TabsContent value="history">
                {historyContent}
            </TabsContent>
        </Tabs>
    )
}
