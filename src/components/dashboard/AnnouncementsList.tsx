'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

type Announcement = {
    id: string
    title: string
    content: string
    priority: 'normal' | 'high'
    published_at: string
}

export function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 shrink-0">
                <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-700">
                    <Megaphone className="h-4 w-4 text-blue-500" />
                    事務局からのお知らせ
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
                {announcements.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                        お知らせはありません。
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {announcements.map((item) => (
                            <Dialog key={item.id}>
                                <DialogTrigger asChild>
                                    <div
                                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group text-left w-full"
                                        onClick={() => setSelectedAnnouncement(item)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 shrink-0">
                                                <Info className={`h-4 w-4 ${item.priority === 'high' ? 'text-red-500' : 'text-blue-400'}`} />
                                            </div>
                                            <div className="flex-1 space-y-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs text-slate-400 shrink-0">
                                                        {format(new Date(item.published_at), 'yyyy/MM/dd', { locale: ja })}
                                                    </span>
                                                    {item.priority === 'high' && (
                                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-medium shrink-0">
                                                            重要
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                                                    {item.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 line-clamp-1 mt-1 truncate">
                                                    {item.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            {item.priority === 'high' && <span className="text-red-500 text-sm border border-red-200 bg-red-50 px-2 py-0.5 rounded-md">重要</span>}
                                            {item.title}
                                        </DialogTitle>
                                        <DialogDescription>
                                            {format(new Date(item.published_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[60vh] overflow-y-auto p-1">
                                        {item.content}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
