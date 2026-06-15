import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Pencil } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteAnnouncementButton } from "./DeleteButton";

export default async function AdminAnnouncementsPage() {
    const supabase = await createClient();

    const { data: announcements, error } = await supabase
        .from('announcements')
        .select(`
            *,
            profiles:created_by ( full_name )
        `)
        .order('published_at', { ascending: false });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">お知らせ管理</h1>
                    <p className="text-muted-foreground">
                        全コーチ向けのお知らせを作成・管理します。
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/admin/announcements/webhooks">
                            <Settings className="mr-2 h-4 w-4 text-indigo-600" />
                            Google Chat連携設定
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/admin/announcements/create">
                            <Plus className="mr-2 h-4 w-4" />
                            新規作成
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">公開日</TableHead>
                            <TableHead>タイトル</TableHead>
                            <TableHead className="w-[100px]">優先度</TableHead>
                            <TableHead className="w-[150px]">作成者</TableHead>
                            <TableHead className="w-[120px] text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!announcements || announcements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    お知らせはありません。
                                </TableCell>
                            </TableRow>
                        ) : (
                            announcements.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {format(new Date(item.published_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {item.title}
                                    </TableCell>
                                    <TableCell>
                                        {item.priority === 'high' ? (
                                            <Badge variant="destructive">重要</Badge>
                                        ) : (
                                            <Badge variant="secondary">通常</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {/* @ts-ignore */}
                                        {item.profiles?.full_name || '不明'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-500 hover:text-slate-700">
                                                <Link href={`/admin/announcements/${item.id}/edit`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <DeleteAnnouncementButton id={item.id} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
