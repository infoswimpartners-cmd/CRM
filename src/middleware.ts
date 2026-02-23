import { NextResponse, type NextRequest } from 'next/server'
// import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
    // skip API webhooks and static/image files manually
    const { pathname } = request.nextUrl
    if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.includes('favicon.ico') ||
        pathname.match(/\.(svg|png|jpg|jpeg|gif|webp)$/)
    ) {
        return NextResponse.next()
    }

    try {
        // const response = await updateSession(request)
        // return response;
        const response = NextResponse.next();
        // Relax CSP to allow 'eval' in development to fix HMR/UI update issues
        response.headers.set('Content-Security-Policy', "script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; object-src 'none';")
        return response
    } catch (e: any) {
        console.error("Middleware caught error:", e)
        return new NextResponse("Middleware Error: " + String(e.message) + " | Stack: " + String(e.stack), { status: 500 })
    }
}

// Config removed completely
// Config removed completely to avoid Edge RegExp compilation failures
// Next.js will run middleware on all routes and we exclude them manually in code
