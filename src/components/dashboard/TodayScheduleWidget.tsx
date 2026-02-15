import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Clock, Edit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export async function TodayScheduleWidget({ coachId }: { coachId: string }) {
    const supabase = await createClient();

    // Get today's start and end properly in JST/Server time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: schedules } = await supabase
        .from('lesson_schedules')
        .select(`
            id,
            start_time,
            end_time,
            location,
            lesson_master_id,
            students ( full_name )
        `)
        .eq('coach_id', coachId)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true });

    if (!schedules || schedules.length === 0) {
        return (
            <Card className="border-dashed border-slate-300 shadow-none bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="bg-slate-100 p-3 rounded-full mb-3">
                        <Calendar className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600">本日の予定はありません</p>
                    <p className="text-sm text-slate-400 mt-1">明日の予定を確認するか、新しい予定を登録してください</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    本日のスケジュール
                    <span className="text-xs font-normal text-slate-500 ml-2 bg-slate-100 px-2 py-0.5 rounded-full">
                        {format(new Date(), 'MM/dd (E)', { locale: ja })}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {schedules.map((schedule) => {
                        const startTime = new Date(schedule.start_time);
                        const endTime = new Date(schedule.end_time);
                        const students: any = schedule.students;
                        const studentName = Array.isArray(students)
                            ? students[0]?.full_name
                            : students?.full_name;

                        return (
                            <div key={schedule.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-start sm:items-center gap-4">
                                    <div className="bg-blue-50 text-blue-700 font-mono text-sm px-3 py-2 rounded-lg text-center min-w-[100px] border border-blue-100">
                                        <div className="font-bold">{format(startTime, 'HH:mm')}</div>
                                        <div className="text-xs opacity-70">↓ {format(endTime, 'HH:mm')}</div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-lg">
                                            {studentName || '生徒未設定'}
                                        </h4>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {schedule.location || '場所未設定'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Button asChild size="sm" className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm">
                                    <Link href={`/coach/report?scheduleId=${schedule.id}`}>
                                        <Edit className="mr-2 h-3 w-3" />
                                        完了報告を入力
                                    </Link>
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
