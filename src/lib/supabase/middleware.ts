import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    // Create a new request with the header
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', request.nextUrl.pathname)

    let supabaseResponse = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: requestHeaders,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // List of reliable paths that don't need auth check if no cookies present
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/forgot-password') || request.nextUrl.pathname.startsWith('/member/login')

    // If on an auth page and no cookies, we can skip the getUser call
    if (isAuthPage) {
        const allCookies = request.cookies.getAll()
        // Simple heuristic: if no cookies at all, or very few, user is likely not logged in
        if (allCookies.length === 0) {
            return supabaseResponse
        }
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Member routes protection
    const isMemberPage = request.nextUrl.pathname.startsWith('/member') && !request.nextUrl.pathname.startsWith('/member/login')
    const isMemberLoginPage = request.nextUrl.pathname.startsWith('/member/login')
    const nextAuthSessionToken = request.cookies.get('next-auth.session-token')?.value || request.cookies.get('__Secure-next-auth.session-token')?.value

    if (isMemberPage) {
        // If has Supabase user or NextAuth session, allow access
        if (user || nextAuthSessionToken) {
            return supabaseResponse
        }
        // Otherwise redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/member/login'
        return NextResponse.redirect(url)
    }

    if (isMemberLoginPage && (user || nextAuthSessionToken)) {
        const url = request.nextUrl.clone()
        url.pathname = '/member/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
