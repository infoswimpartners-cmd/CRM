import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Video, Image as ImageIcon } from 'lucide-react'
import { LessonMediaUploader } from '@/components/coach/LessonMediaUploader'

export default async function LessonMediaPage({ params }: { params: { lessonId: string } }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { lessonId } = params

    // レッスン情報を取得
    const { data: lesson, error } = await supabase
        .from('lessons')
        .select(`
            id, lesson_date, location, status,
            students ( full_name ),
            profiles:coach_id ( full_name )
        `)
        .eq('id', lessonId)
        .eq('coach_id', user.id) // 自分のレッスンのみ
        .single()

    if (error || !lesson) {
        return (
            <div className="p-4">
                <p className="text-red-500">レッスンが見つかりません</p>
                <Link href="/coach" className="text-blue-500 text-sm mt-2 inline-block">← コーチホームへ</Link>
            </div>
        )
    }

    // 既存のメディアを取得
    const { data: existingMedia } = await supabase
        .from('lesson_media')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: true })

    const lessonDate = new Date(lesson.lesson_date)
    const studentName = (lesson.students as any)?.full_name || '生徒名未設定'

    return (
        <div className="max-w-xl mx-auto space-y-6 pb-10">
            {/* ヘッダー */}
            <div className="flex items-center gap-3">
                <Link href="/coach" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-lg font-bold text-gray-800">動画・写真を追加</h1>
                    <p className="text-xs text-gray-500">
                        {lessonDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} · {studentName}
                    </p>
                </div>
            </div>

            {/* 既存のメディア */}
            {existingMedia && existingMedia.length > 0 && (
                <div>
                    <h2 className="text-sm font-bold text-gray-600 mb-3">アップロード済み ({existingMedia.length}件)</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {existingMedia.map((media: any) => (
                            <div
                                key={media.id}
                                className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative"
                            >
                                {media.media_type === 'youtube' && media.youtube_video_id ? (
                                    <img
                                        src={`https://img.youtube.com/vi/${media.youtube_video_id}/mqdefault.jpg`}
                                        alt={media.caption || ''}
                                        className="w-full h-full object-cover"
                                    />
                                ) : media.media_type === 'image' && media.storage_path ? (
                                    <img
                                        src={media.storage_path}
                                        alt={media.caption || ''}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                        <Video className="w-6 h-6 text-blue-500" />
                                    </div>
                                )}
                                {/* タイプバッジ */}
                                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1 rounded">
                                    {media.media_type === 'youtube' ? 'YT' : media.media_type === 'image' ? '写真' : '動画'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* アップローダー */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-500" />
                    新しいメディアを追加
                </h2>
                <LessonMediaUploader
                    lessonId={lessonId}
                    onUploadComplete={() => {
                        // クライアントサイドでリロード
                    }}
                />
            </div>

            {/* コーチアドバイス */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <h3 className="text-sm font-bold text-blue-800 mb-2">📌 動画アップロードのヒント</h3>
                <ul className="text-xs text-blue-700 space-y-1.5 list-disc list-inside">
                    <li>YouTube限定公開が最も便利です（ストレージ費用なし）</li>
                    <li>スマホで撮影後、YouTubeアプリから「限定公開」でアップロード</li>
                    <li>URLをコピーしてこちらに貼り付けるだけで完了</li>
                    <li>画像や動画を直接アップロードする場合は100MBまで</li>
                </ul>
            </div>
        </div>
    )
}
