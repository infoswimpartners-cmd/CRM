import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Megaphone } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export async function AnnouncementsWidget() {
    const supabase = await createClient();
    const { data: announcements } = await supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(3);

    if (!announcements || announcements.length === 0) {
        return null;
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                <CardTitle className="text-base font-medium flex items-center gap-2 text-slate-700">
                    <Megaphone className="h-4 w-4 text-blue-500" />
                    事務局からのお知らせ
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {announcements.map((item) => (
                        <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 shrink-0">
                                    <Info className={`h-4 w-4 ${item.priority === 'high' ? 'text-red-500' : 'text-blue-400'}`} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400">
                                            {format(new Date(item.published_at), 'yyyy/MM/dd', { locale: ja })}
                                        </span>
                                        {item.priority === 'high' && (
                                            <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-medium">
                                                重要
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-1 mt-1">
                                        {item.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
