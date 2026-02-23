'use client'

import { useState, useRef } from 'react'
import { Youtube, Upload, X, Loader2, Play, Image as ImageIcon, CheckCircle, Link as LinkIcon } from 'lucide-react'

interface MediaUploadItem {
    id: string
    type: 'youtube' | 'video' | 'image'
    preview: string
    caption: string
    youtubeId?: string
}

interface LessonMediaUploaderProps {
    lessonId: string
    onUploadComplete?: () => void
}

// YouTube動画IDを抽出
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

export function LessonMediaUploader({ lessonId, onUploadComplete }: LessonMediaUploaderProps) {
    const [uploads, setUploads] = useState<MediaUploadItem[]>([])
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [activeTab, setActiveTab] = useState<'youtube' | 'file'>('youtube')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleYouTubeAdd = () => {
        const videoId = extractYouTubeId(youtubeUrl)
        if (!videoId) {
            alert('有効なYouTube URLを入力してください')
            return
        }
        const newItem: MediaUploadItem = {
            id: Date.now().toString(),
            type: 'youtube',
            preview: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            caption: '',
            youtubeId: videoId,
        }
        setUploads(prev => [...prev, newItem])
        setYoutubeUrl('')
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        files.forEach(file => {
            const isVideo = file.type.startsWith('video/')
            const isImage = file.type.startsWith('image/')
            if (!isVideo && !isImage) return

            const url = URL.createObjectURL(file)
            const newItem: MediaUploadItem = {
                id: Date.now().toString() + Math.random(),
                type: isVideo ? 'video' : 'image',
                preview: url,
                caption: '',
            }
                // fileオブジェクトを保持（アップロード時に使用）
                ; (newItem as any)._file = file
            setUploads(prev => [...prev, newItem])
        })
        // inputをリセット
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRemove = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id))
    }

    const handleCaptionChange = (id: string, caption: string) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, caption } : u))
    }

    const handleSubmit = async () => {
        if (uploads.length === 0) return
        setIsUploading(true)
        setUploadStatus('idle')

        try {
            for (let i = 0; i < uploads.length; i++) {
                const upload = uploads[i]
                const formData = new FormData()
                formData.append('lesson_id', lessonId)
                formData.append('caption', upload.caption)
                formData.append('display_order', i.toString())

                if (upload.type === 'youtube' && upload.youtubeId) {
                    formData.append('youtube_url', `https://www.youtube.com/watch?v=${upload.youtubeId}`)
                } else {
                    const file = (upload as any)._file as File
                    if (!file) continue
                    formData.append('file', file)
                }

                const res = await fetch('/api/coach/lesson-media', {
                    method: 'POST',
                    body: formData,
                })

                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || 'アップロードに失敗しました')
                }
            }

            setUploadStatus('success')
            setUploads([])
            onUploadComplete?.()
        } catch (error: any) {
            console.error('[LessonMediaUploader] error:', error)
            alert(error.message || 'アップロードに失敗しました')
            setUploadStatus('error')
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-4">
            {/* タブ切り替え */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button
                    type="button"
                    onClick={() => setActiveTab('youtube')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors ${activeTab === 'youtube'
                            ? 'bg-red-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Youtube className="w-4 h-4" />
                    YouTube（推奨）
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('file')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors ${activeTab === 'file'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <Upload className="w-4 h-4" />
                    ファイル
                </button>
            </div>

            {/* YouTube URL入力 */}
            {activeTab === 'youtube' && (
                <div className="space-y-2">
                    <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-800 border border-yellow-100">
                        💡 <strong>コスト節約推奨:</strong> 動画はYouTube限定公開でアップロードし、URLを貼り付けると、ストレージ費用を節約できます
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="url"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 transition-all"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleYouTubeAdd}
                            disabled={!youtubeUrl}
                            className="px-4 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            追加
                        </button>
                    </div>
                </div>
            )}

            {/* ファイルアップロード */}
            {activeTab === 'file' && (
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                    >
                        <Upload className="w-8 h-8 text-gray-300 group-hover:text-blue-400 mx-auto mb-2 transition-colors" />
                        <p className="text-sm font-bold text-gray-500 group-hover:text-blue-500 transition-colors">
                            写真・動画を選択
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            対応: jpg, png, mp4, mov など（100MBまで）
                        </p>
                    </button>
                </div>
            )}

            {/* プレビューリスト */}
            {uploads.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500">{uploads.length}件のメディア</p>
                    {uploads.map((upload) => (
                        <div key={upload.id} className="flex gap-3 bg-white rounded-xl border border-gray-100 p-3">
                            {/* サムネイル */}
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                                {upload.type === 'youtube' || upload.type === 'image' ? (
                                    <img src={upload.preview} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-blue-100">
                                        <Play className="w-6 h-6 text-blue-500 fill-current" />
                                    </div>
                                )}
                                {upload.type === 'youtube' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Youtube className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>

                            {/* キャプション */}
                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={upload.caption}
                                    onChange={(e) => handleCaptionChange(upload.id, e.target.value)}
                                    placeholder="キャプション（任意）"
                                    className="w-full text-sm border-b border-gray-200 py-1 focus:outline-none focus:border-blue-400 bg-transparent"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {upload.type === 'youtube' ? 'YouTube' : upload.type === 'video' ? '動画' : '写真'}
                                </p>
                            </div>

                            {/* 削除ボタン */}
                            <button
                                type="button"
                                onClick={() => handleRemove(upload.id)}
                                className="p-1 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-400 transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {/* 一括アップロードボタン */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                アップロード中...
                            </>
                        ) : uploadStatus === 'success' ? (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                アップロード完了
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                {uploads.length}件をアップロード
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
