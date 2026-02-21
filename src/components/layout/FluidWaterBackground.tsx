'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export const FluidWaterBackground = () => {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
            {/* Soft, fluid liquid blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-100/40 rounded-full mix-blend-multiply filter blur-[80px] animate-[blob_20s_infinite_ease-in-out]" />
            <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-cyan-100/30 rounded-full mix-blend-multiply filter blur-[80px] animate-[blob_25s_infinite_ease-in-out_2s]" />
            <div className="absolute bottom-[10%] left-[20%] w-[35%] h-[35%] bg-blue-50/50 rounded-full mix-blend-multiply filter blur-[80px] animate-[blob_18s_infinite_ease-in-out_4s]" />
            <div className="absolute top-[60%] right-[10%] w-[50%] h-[50%] bg-cyan-50/40 rounded-full mix-blend-multiply filter blur-[80px] animate-[blob_30s_infinite_ease-in-out_6s]" />

            {/* Subtle light glares */}
            <div className="absolute top-[40%] left-[30%] w-[20%] h-[20%] bg-white/20 rounded-full filter blur-[100px] animate-pulse" />
        </div>
    )
}
