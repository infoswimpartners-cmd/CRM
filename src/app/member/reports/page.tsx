import { createClient } from '@/lib/supabase/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, MapPin, ChevronRight, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default async function ReportsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const session = await getServerSession(authOptions);

    if (!user && !session) {
        redirect('/member/login');
    }

    const client = user ? supabase : createAdminClient();
    const field = user ? 'auth_user_id' : 'line_user_id';
    const userId = user ? user.id : (session?.user as any).id;

    // Fetch Student ID first
    const { data: student } = await client
        .from('students')
        .select('id')
        .eq(field, userId)
        .single();

    if (!student) return <div>Student not found</div>;

    // Fetch Past Lessons
    const now = new Date().toISOString();
    const { data: lessons, error } = await client
        .from('lessons')
        .select(`
            id, lesson_date, location,
            profiles ( full_name, avatar_url )
        `)
        .eq('student_id', student.id)
        .lte('lesson_date', now) // Only past/current lessons
        .order('lesson_date', { ascending: false });

    if (error) {
        console.error(error);
        return <div>Error loading reports</div>;
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-2">
                <Link href="/member/dashboard" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </Link>
                <h1 className="text-xl font-bold text-gray-800">レッスン記録</h1>
            </div>

            {lessons && lessons.length > 0 ? (
                <div className="space-y-4">
                    {lessons.map((lesson: any) => {
                        const date = new Date(lesson.lesson_date);
                        return (
                            <Link href={`/member/reports/${lesson.id}`} key={lesson.id} className="block group">
                                <div className="glass-card p-5 hover:border-blue-400 transition-all duration-300 group-hover:shadow-lg relative overflow-hidden">
                                    {/* Accent on Hover */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-bottom" />

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-start gap-5">
                                            {/* Date Box */}
                                            <div className="flex flex-col items-center justify-center bg-blue-50 rounded-xl w-14 h-14 shrink-0 text-blue-600">
                                                <span className="text-xs font-bold uppercase">{date.getMonth() + 1}月</span>
                                                <span className="text-xl font-black leading-none">{date.getDate()}</span>
                                            </div>

                                            <div>
                                                <div className="font-bold text-gray-800 text-lg mb-1">
                                                    レッスンレポート
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                        {lesson.location || '場所未定'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                                        {lesson.profiles?.full_name || '担当コーチ'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="glass-card p-10 text-center">
                    <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="text-gray-400 w-8 h-8" />
                    </div>
                    <p className="text-gray-500 font-medium">まだレッスン記録はありません</p>
                    <p className="text-xs text-gray-400 mt-2">レッスン終了後にコーチが記録を作成します</p>
                </div>
            )}
        </div>
    );
}
