import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    try {
        const response = await updateSession(request)
        // Relax CSP to allow 'eval' in development to fix HMR/UI update issues
        response.headers.set('Content-Security-Policy', "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; object-src 'none';")
        return response
    } catch (e: any) {
        console.error("Middleware caught error:", e)
        return new NextResponse("Middleware Error: " + String(e.message) + " | Stack: " + String(e.stack), { status: 500 })
    }
}

export const config = {
    matcher: [
        /*
         * 下記のパス以外すべてにミドルウェアを適用:
         * - _next/static (静的ファイル)
         * - _next/image (画像最適化)
         * - favicon.ico (ファビコン)
         * - publicフォルダ内の画像、manifest.jsonなど
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
