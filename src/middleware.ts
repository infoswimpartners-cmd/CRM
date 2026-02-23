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
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
