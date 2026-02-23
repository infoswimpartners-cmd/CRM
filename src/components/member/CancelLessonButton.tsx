'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, Calendar, MapPin, User, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { cancelLesson } from '@/actions/member/cancelLesson'

interface Lesson {
    id: string
    lesson_date: string
    location: string | null
    status: string
    coach_name: string
    is_penalty_cancellation: boolean
    can_cancel: boolean
}

interface CancelLessonButtonProps {
    lesson: Lesson
    onCancelled?: (lessonId: string) => void
}

export function CancelLessonButton({ lesson, onCancelled }: CancelLessonButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    const lessonDate = new Date(lesson.lesson_date)
    const isPenalty = lesson.is_penalty_cancellation

    const handleCancel = () => {
        startTransition(async () => {
            const res = await cancelLesson(lesson.id)
            if (res.success) {
                setResult({
                    type: 'success',
                    message: res.isPenalty
                        ? 'キャンセルしました。前日12時以降のため、チケット1枚が消化されます。'
                        : 'キャンセルしました。チケット1枚が振替されました。',
                })
                setShowConfirm(false)
                onCancelled?.(lesson.id)
            } else {
                setResult({ type: 'error', message: res.error || 'エラーが発生しました' })
                setShowConfirm(false)
            }
        })
    }

    if (result) {
        return (
            <div className={`flex items-start gap-2 p-3 rounded-xl text-sm ${result.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                {result.type === 'success'
                    ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                }
                <span>{result.message}</span>
            </div>
        )
    }

    if (!lesson.can_cancel) {
        return (
            <span className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                キャンセル不可
            </span>
        )
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-all active:scale-95"
            >
                キャンセルする
            </button>

            {/* 確認モーダル */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
                    {/* オーバーレイ */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowConfirm(false)}
                    />

                    {/* モーダル本体 */}
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                        {/* ヘッダー */}
                        <div className={`p-5 ${isPenalty ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    <h3 className="font-black text-lg">
                                        {isPenalty ? 'キャンセル料が発生します' : 'キャンセル確認'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            {isPenalty && (
                                <p className="text-sm text-red-100">
                                    前日12:00を過ぎているため、チケット1枚が消化されます
                                </p>
                            )}
                        </div>

                        {/* レッスン情報 */}
                        <div className="p-5 space-y-3">
                            <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="font-bold text-gray-800">
                                        {format(lessonDate, 'yyyy年M月d日（E）HH:mm', { locale: ja })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="text-gray-600">{lesson.coach_name} コーチ</span>
                                </div>
                                {lesson.location && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                                        <span className="text-gray-600">{lesson.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* ペナルティ説明 */}
                            <div className={`rounded-2xl p-4 text-sm ${isPenalty
                                    ? 'bg-red-50 border border-red-100 text-red-700'
                                    : 'bg-green-50 border border-green-100 text-green-700'
                                }`}>
                                {isPenalty ? (
                                    <>
                                        <p className="font-bold mb-1">⚠️ 前日12:00以降のキャンセル</p>
                                        <p>キャンセル料（100%）が発生します。チケット1枚が消化されます。</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="font-bold mb-1">✅ 前日12:00前のキャンセル</p>
                                        <p>キャンセル料は発生しません。チケット1枚が振替されます。</p>
                                    </>
                                )}
                            </div>

                            {/* ボタン */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                                >
                                    戻る
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isPending}
                                    className={`flex-1 py-3 rounded-2xl text-white font-black transition-all active:scale-95 flex items-center justify-center gap-2 ${isPenalty
                                            ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200'
                                            : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200'
                                        } disabled:opacity-50`}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            処理中...
                                        </>
                                    ) : (
                                        'キャンセルを確定する'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
