'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Clock, MapPin, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { bookLesson } from './actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function ReservationClient({ coachId, isRequestPeriod }: { coachId: string, isRequestPeriod: boolean }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [bookingSchedule, setBookingSchedule] = useState<any | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const { toast } = useToast();

    // Fetch schedules when month changes
    useEffect(() => {
        const fetchSchedules = async () => {
            setLoading(true);
            try {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const res = await fetch(`/api/reservation/available?coachId=${coachId}&year=${year}&month=${month}`);
                const data = await res.json();
                if (data.schedules) {
                    setSchedules(data.schedules);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (isRequestPeriod) {
            fetchSchedules();
        }
    }, [currentDate, coachId, isRequestPeriod]);

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        setSelectedDate(null);
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        setSelectedDate(null);
    };

    const getSchedulesForDate = (date: Date) => {
        return schedules.filter(s => isSameDay(new Date(s.start_time), date));
    };

    const handleBook = async () => {
        if (!bookingSchedule) return;
        setIsBooking(true);
        try {
            await bookLesson(bookingSchedule.id);
            toast({
                title: "予約リクエスト完了",
                description: "予約のリクエストを送信しました。",
            });
            setBookingSchedule(null);
            // Re-fetch or update local state
            setSchedules(prev => prev.filter(s => s.id !== bookingSchedule.id));
        } catch (e: any) {
            toast({
                title: "エラー",
                description: e.message || "予約に失敗しました。",
                variant: "destructive"
            });
        } finally {
            setIsBooking(false);
        }
    };

    if (!isRequestPeriod) {
        return (
            <div className="glass-card p-8 border border-yellow-200/50 bg-yellow-50/50 text-center">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-600">
                    <CalendarIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">予約リクエスト期間外</h3>
                <p className="text-gray-600 mb-4">
                    毎月20日〜25日の間のみ、翌月以降の予約リクエストが可能です。
                </p>
                <div className="text-xs text-gray-500 bg-white/50 p-3 rounded-lg inline-block">
                    現在は期間外のため、この機能は利用できません。
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Calendar Card */}
            <div className="glass-card p-6 overflow-hidden relative">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-blue-100/30 blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="hover:bg-blue-50 text-blue-600">
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {format(currentDate, 'yyyy', { locale: ja })}
                        <span className="text-blue-600 ml-2">{format(currentDate, 'M月', { locale: ja })}</span>
                    </h2>
                    <Button variant="ghost" size="icon" onClick={handleNextMonth} className="hover:bg-blue-50 text-blue-600">
                        <ChevronRight className="w-6 h-6" />
                    </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2 relative z-10">
                    {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                        <div key={i} className={cn("text-xs font-bold", i === 0 && "text-red-500", i === 6 && "text-blue-500", (i !== 0 && i !== 6) && "text-gray-400")}>
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2 relative z-10">
                    {/* Empty cells for start of month */}
                    {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {days.map((day) => {
                        const dailySchedules = getSchedulesForDate(day);
                        const hasSlots = dailySchedules.length > 0;
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <button
                                key={day.toISOString()}
                                onClick={() => setSelectedDate(day)}
                                className={cn(
                                    "aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-200",
                                    isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-300 transform scale-105" : "bg-white/50 hover:bg-white text-gray-700 hover:shadow-md",
                                    isToday && !isSelected && "border-2 border-blue-200 bg-blue-50",
                                )}
                            >
                                <span className={cn("text-sm font-bold", isToday && !isSelected && "text-blue-600")}>
                                    {format(day, 'd')}
                                </span>
                                <div className="h-2 mt-1 flex items-center justify-center">
                                    {hasSlots && (
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-green-500")} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Slots List */}
            {selectedDate && (
                <div className="space-y-4 animate-fade-in-up">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 px-1">
                        <CalendarIcon className="w-5 h-5 text-blue-500" />
                        {format(selectedDate, 'M月d日 (E)', { locale: ja })} の空き状況
                    </h3>

                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-400 w-8 h-8" /></div>
                    ) : getSchedulesForDate(selectedDate).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {getSchedulesForDate(selectedDate).map((schedule) => (
                                <button
                                    key={schedule.id}
                                    onClick={() => setBookingSchedule(schedule)}
                                    className="glass-card p-5 w-full text-left group hover:border-blue-400 transition-all active:scale-[0.98]"
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Clock className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-black text-gray-800 leading-tight">
                                                    {format(new Date(schedule.start_time), 'HH:mm')}
                                                    <span className="text-sm font-normal text-gray-400 mx-1">-</span>
                                                    {format(new Date(schedule.end_time), 'HH:mm')}
                                                </p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {schedule.location || '場所未定'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-100 rounded-full p-2 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                            <ChevronRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 glass-card">
                            <p className="text-gray-400">予約可能な枠がありません</p>
                        </div>
                    )}
                </div>
            )}

            {/* Booking Confirm Dialog */}
            <Dialog open={!!bookingSchedule} onOpenChange={(open) => !open && setBookingSchedule(null)}>
                <DialogContent className="max-w-xs sm:max-w-md bg-white/95 backdrop-blur-xl border-white/20 rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold">予約の確認</DialogTitle>
                        <DialogDescription className="text-center">
                            以下の内容で予約をリクエストします。
                        </DialogDescription>
                    </DialogHeader>
                    {bookingSchedule && (
                        <div className="py-6 space-y-4">
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                                <div className="text-sm text-blue-600 font-bold mb-1">
                                    {format(new Date(bookingSchedule.start_time), 'yyyy年 M月 d日 (E)', { locale: ja })}
                                </div>
                                <div className="text-3xl font-black text-gray-800">
                                    {format(new Date(bookingSchedule.start_time), 'HH:mm')}
                                </div>
                                <div className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {bookingSchedule.location || '場所未定'}
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                <span>チケットを1枚消費してリクエストを送信します。コーチが承認すると予約確定となります。</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="grid grid-cols-2 gap-2 sm:gap-2">
                        <Button variant="outline" onClick={() => setBookingSchedule(null)} disabled={isBooking} className="w-full rounded-xl h-12">
                            キャンセル
                        </Button>
                        <Button onClick={handleBook} disabled={isBooking} className="w-full rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200">
                            {isBooking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            確定する
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
