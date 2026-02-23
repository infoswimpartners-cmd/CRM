'use client'

import { useState } from 'react'
import { Play, Image as ImageIcon, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

interface MediaItem {
    id: string
    media_type: 'video' | 'image' | 'youtube'
    storage_path: string | null
    youtube_video_id: string | null
    caption: string | null
    display_order: number
}

interface LessonMediaGalleryProps {
    mediaItems: MediaItem[]
}

export function LessonMediaGallery({ mediaItems }: LessonMediaGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    const selectedItem = selectedIndex !== null ? mediaItems[selectedIndex] : null

    const handlePrev = () => {
        if (selectedIndex === null) return
        setSelectedIndex((selectedIndex - 1 + mediaItems.length) % mediaItems.length)
    }

    const handleNext = () => {
        if (selectedIndex === null) return
        setSelectedIndex((selectedIndex + 1) % mediaItems.length)
    }

    return (
        <>
            {/* グリッドギャラリー */}
            <div className="grid grid-cols-2 gap-3">
                {mediaItems.map((item, index) => (
                    <button
                        key={item.id}
                        onClick={() => setSelectedIndex(index)}
                        className="aspect-video relative rounded-2xl overflow-hidden bg-gray-100 group shadow-md hover:shadow-xl transition-all duration-300 active:scale-95"
                    >
                        {item.media_type === 'youtube' && item.youtube_video_id ? (
                            <>
                                {/* YouTube サムネイル */}
                                <img
                                    src={`https://img.youtube.com/vi/${item.youtube_video_id}/mqdefault.jpg`}
                                    alt={item.caption || 'レッスン動画'}
                                    className="w-full h-full object-cover"
                                />
                                {/* 再生ボタンオーバーレイ */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
                                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5 text-gray-800 fill-current ml-0.5" />
                                    </div>
                                </div>
                            </>
                        ) : item.media_type === 'video' ? (
                            <>
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                                    <Play className="w-10 h-10 text-white/80 fill-current" />
                                </div>
                                <div className="absolute bottom-2 right-2">
                                    <span className="text-[10px] font-bold text-white/80 bg-black/30 px-1.5 py-0.5 rounded">
                                        動画
                                    </span>
                                </div>
                            </>
                        ) : item.storage_path ? (
                            <img
                                src={item.storage_path}
                                alt={item.caption || 'レッスン写真'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                            </div>
                        )}

                        {/* キャプション */}
                        {item.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                <p className="text-white text-xs font-medium line-clamp-1">{item.caption}</p>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* フルスクリーンモーダル */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
                    {/* 上部コントロール */}
                    <div className="flex items-center justify-between p-4 text-white">
                        <span className="text-sm font-medium text-white/60">
                            {selectedIndex! + 1} / {mediaItems.length}
                        </span>
                        {selectedItem.media_type === 'youtube' && selectedItem.youtube_video_id && (
                            <a
                                href={`https://www.youtube.com/watch?v=${selectedItem.youtube_video_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                YouTubeで開く
                            </a>
                        )}
                        <button
                            onClick={() => setSelectedIndex(null)}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>
                    </div>

                    {/* メインコンテンツ */}
                    <div className="flex-1 flex items-center justify-center relative px-12">
                        {/* 前へ */}
                        {mediaItems.length > 1 && (
                            <button
                                onClick={handlePrev}
                                className="absolute left-2 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8 text-white" />
                            </button>
                        )}

                        {/* コンテンツ */}
                        <div className="w-full max-w-lg">
                            {selectedItem.media_type === 'youtube' && selectedItem.youtube_video_id ? (
                                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${selectedItem.youtube_video_id}?autoplay=1&rel=0`}
                                        title={selectedItem.caption || 'レッスン動画'}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full"
                                    />
                                </div>
                            ) : selectedItem.media_type === 'video' && selectedItem.storage_path ? (
                                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black">
                                    <video
                                        src={selectedItem.storage_path}
                                        controls
                                        autoPlay
                                        playsInline
                                        className="w-full h-full"
                                    />
                                </div>
                            ) : selectedItem.storage_path ? (
                                <img
                                    src={selectedItem.storage_path}
                                    alt={selectedItem.caption || 'レッスン写真'}
                                    className="w-full rounded-2xl object-contain max-h-[60vh]"
                                />
                            ) : (
                                <div className="aspect-video flex items-center justify-center bg-gray-800 rounded-2xl">
                                    <p className="text-white/50 text-sm">メディアを表示できません</p>
                                </div>
                            )}

                            {/* キャプション */}
                            {selectedItem.caption && (
                                <p className="text-white/80 text-sm text-center mt-4 px-4">
                                    {selectedItem.caption}
                                </p>
                            )}
                        </div>

                        {/* 次へ */}
                        {mediaItems.length > 1 && (
                            <button
                                onClick={handleNext}
                                className="absolute right-2 p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <ChevronRight className="w-8 h-8 text-white" />
                            </button>
                        )}
                    </div>

                    {/* ドットインジケーター */}
                    {mediaItems.length > 1 && (
                        <div className="flex justify-center gap-2 p-6">
                            {mediaItems.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === selectedIndex ? 'bg-white w-6' : 'bg-white/30'
                                        }`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
