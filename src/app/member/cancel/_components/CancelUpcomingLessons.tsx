'use client'

import { useState } from 'react'
import { format, differenceInHours } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, MapPin, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { CancelLessonButton } from '@/components/member/CancelLessonButton'

interface Lesson {
    id: string
    lesson_date: string
    location: string | null
    status: string
    profiles: any | null
}

interface CancelUpcomingLessonsProps {
    lessons: Lesson[]
    studentId: string
}

export function CancelUpcomingLessons({ lessons: initialLessons, studentId }: CancelUpcomingLessonsProps) {
    const [lessons, setLessons] = useState(initialLessons)

    const handleCancelled = (lessonId: string) => {
        // キャンセルされたレッスンをリストから除外
        setLessons(prev => prev.filter(l => l.id !== lessonId))
    }

    if (lessons.length === 0) {
        return (
            <div className="glass-card p-10 text-center">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="text-gray-300 w-8 h-8" />
                </div>
                <p className="text-gray-500 font-medium">予約済みのレッスンはありません</p>
                <p className="text-xs text-gray-400 mt-2">
                    LINEでコーチにレッスンの相談をしましょう
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-500 px-1">予約済みレッスン（{lessons.length}件）</h2>
            {lessons.map((lesson) => {
                const lessonDate = new Date(lesson.lesson_date)
                const now = new Date()

                // 前日12:00の計算
                const deadline = new Date(lessonDate)
                deadline.setDate(deadline.getDate() - 1)
                deadline.setHours(12, 0, 0, 0)
                const isPenalty = now >= deadline

                // 残り時間
                const hoursUntilLesson = differenceInHours(lessonDate, now)

                return (
                    <div
                        key={lesson.id}
                        className={`glass-card p-5 relative overflow-hidden ${isPenalty ? 'border-red-200/60' : 'border-white/60'
                            }`}
                    >
                        {/* ペナルティ判定インジケーター */}
                        <div className={`absolute top-0 left-0 w-1 h-full ${isPenalty ? 'bg-red-400' : 'bg-green-400'}`} />

                        <div className="pl-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2 flex-1 min-w-0">
                                    {/* 日時 */}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span className="font-bold text-gray-800 text-sm">
                                            {format(lessonDate, 'M月d日（E） HH:mm', { locale: ja })}
                                        </span>
                                    </div>

                                    {/* コーチ */}
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                                        <span className="text-sm text-gray-600">
                                            {lesson.profiles?.full_name || '担当なし'} コーチ
                                        </span>
                                    </div>

                                    {/* 場所 */}
                                    {lesson.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                            <span className="text-sm text-gray-600 truncate">{lesson.location}</span>
                                        </div>
                                    )}

                                    {/* ペナルティ警告 */}
                                    {isPenalty && (
                                        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg mt-1">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            キャンセル料が発生します（前日12時以降）
                                        </div>
                                    )}

                                    {/* 残り時間表示 */}
                                    <div className="text-xs text-gray-400">
                                        あと {hoursUntilLesson}時間後
                                    </div>
                                </div>

                                {/* キャンセルボタン */}
                                <div className="shrink-0">
                                    <CancelLessonButton
                                        lesson={{
                                            id: lesson.id,
                                            lesson_date: lesson.lesson_date,
                                            location: lesson.location,
                                            status: lesson.status,
                                            coach_name: lesson.profiles?.full_name || '担当なし',
                                            is_penalty_cancellation: isPenalty,
                                            can_cancel: true,
                                        }}
                                        onCancelled={handleCancelled}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
