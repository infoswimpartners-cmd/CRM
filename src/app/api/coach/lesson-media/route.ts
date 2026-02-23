import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// YouTube動画IDを抽出するヘルパー関数
function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match) return match[1]
    }
    return null
}

/**
 * POST /api/coach/lesson-media
 * コーチがレッスンメディアを追加する
 * 対応形式:
 * 1. YouTube URL（最推奨: ストレージ不要）
 * 2. 画像/動画ファイル（Supabase Storageへアップロード）
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // コーチ権限確認
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
        return NextResponse.json({ error: 'Coach or admin required' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''

    // フォームデータ（ファイルアップロード or YouTube URL）
    if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        const lessonId = formData.get('lesson_id') as string
        const caption = formData.get('caption') as string | null
        const youtubeUrl = formData.get('youtube_url') as string | null
        const file = formData.get('file') as File | null
        const displayOrder = parseInt(formData.get('display_order') as string || '0')

        if (!lessonId) {
            return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 })
        }

        // レッスンのオーナーシップ確認
        const { data: lesson } = await supabase
            .from('lessons')
            .select('id, coach_id')
            .eq('id', lessonId)
            .single()

        if (!lesson || (lesson.coach_id !== user.id && profile.role !== 'admin')) {
            return NextResponse.json({ error: 'Lesson not found or access denied' }, { status: 403 })
        }

        // YouTube URLの場合
        if (youtubeUrl) {
            const videoId = extractYouTubeId(youtubeUrl)
            if (!videoId) {
                return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
            }

            const { data, error } = await supabase
                .from('lesson_media')
                .insert({
                    lesson_id: lessonId,
                    coach_id: user.id,
                    media_type: 'youtube',
                    youtube_video_id: videoId,
                    caption: caption || null,
                    display_order: displayOrder,
                })
                .select()
                .single()

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, media: data })
        }

        // ファイルアップロードの場合
        if (file) {
            // ファイルサイズ制限: 100MB
            const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json({ error: 'ファイルサイズは100MB以下にしてください' }, { status: 400 })
            }

            const fileSizeMb = parseFloat((file.size / (1024 * 1024)).toFixed(2))
            const fileExt = file.name.split('.').pop()?.toLowerCase() || ''
            const isVideo = ['mp4', 'mov', 'avi', 'webm'].includes(fileExt)
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)

            if (!isVideo && !isImage) {
                return NextResponse.json({ error: '対応していないファイル形式です（mp4, mov, jpg, png等）' }, { status: 400 })
            }

            // Supabase Storageにアップロード
            const storagePath = `lesson-media/${lessonId}/${Date.now()}.${fileExt}`
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { error: uploadError } = await supabase.storage
                .from('lesson-media')
                .upload(storagePath, buffer, {
                    contentType: file.type,
                    upsert: false,
                })

            if (uploadError) {
                console.error('[lesson-media] upload error:', uploadError)
                return NextResponse.json({ error: 'ファイルのアップロードに失敗しました' }, { status: 500 })
            }

            // 公開URLを取得
            const { data: { publicUrl } } = supabase.storage
                .from('lesson-media')
                .getPublicUrl(storagePath)

            const { data, error } = await supabase
                .from('lesson_media')
                .insert({
                    lesson_id: lessonId,
                    coach_id: user.id,
                    media_type: isVideo ? 'video' : 'image',
                    storage_path: publicUrl,
                    caption: caption || null,
                    display_order: displayOrder,
                    file_size_mb: fileSizeMb,
                })
                .select()
                .single()

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, media: data })
        }

        return NextResponse.json({ error: 'youtube_url or file is required' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}

/**
 * DELETE /api/coach/lesson-media?id=xxx
 */
export async function DELETE(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaId = searchParams.get('id')

    if (!mediaId) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const { data: media } = await supabase
        .from('lesson_media')
        .select('*')
        .eq('id', mediaId)
        .eq('coach_id', user.id)
        .single()

    if (!media) {
        return NextResponse.json({ error: 'Media not found or access denied' }, { status: 403 })
    }

    // Storageのファイルも削除（YouTube以外）
    if (media.media_type !== 'youtube' && media.storage_path) {
        const pathMatch = media.storage_path.match(/lesson-media\/(.+)$/)
        if (pathMatch) {
            await supabase.storage.from('lesson-media').remove([pathMatch[1]])
        }
    }

    const { error } = await supabase
        .from('lesson_media')
        .delete()
        .eq('id', mediaId)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
