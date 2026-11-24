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

    // skip public redirect endpoints from session checks
    if (request.nextUrl.pathname.startsWith('/go/')) {
        return supabaseResponse
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    const rememberMeCookie = request.cookies.get('sb-remember-me')
                    const isRememberMe = rememberMeCookie ? rememberMeCookie.value === 'true' : true

                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request: {
                            headers: requestHeaders,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) => {
                        const finalOptions = isRememberMe ? options : { ...options, maxAge: undefined, expires: undefined };
                        supabaseResponse.cookies.set(name, value, finalOptions)
                    })
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // List of reliable paths that don't need auth check if no cookies present
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/forgot-password') ||
        request.nextUrl.pathname.startsWith('/member/login') ||
        request.nextUrl.pathname.startsWith('/member/activate') ||
        request.nextUrl.pathname.startsWith('/auth/callback')

    // If on an auth page and no cookies, we can skip the getUser call
    if (isAuthPage) {
        const allCookies = request.cookies.getAll()
        // Simple heuristic: if no cookies at all, or very few, user is likely not logged in
        if (allCookies.length === 0) {
            return supabaseResponse
        }
    }

    // APIルートは各ルートハンドラ自身で認証・署名検証を行うため、Middlewareでのセッション通信をスキップ
    if (request.nextUrl.pathname.startsWith('/api/')) {
        return supabaseResponse
    }

    // セッション確認（Cookieから高速読み取り）
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session
    let user = session?.user ?? null

    // アクセストークンの期限切れが近い（残り5分未満）場合のみ Middleware 側で getUser() によるリフレッシュを実行
    // ※ 保護ページ側の Server Component (DashboardLayout / MemberLayout / Page) では必ず getUser() による厳格な検証を行う
    if (session) {
        const nowSec = Math.floor(Date.now() / 1000)
        const expiresAt = session.expires_at ?? 0
        const needsRefresh = expiresAt - nowSec < 300
        if (needsRefresh) {
            const { data: userData } = await supabase.auth.getUser()
            user = userData?.user ?? null
        }
    }

    // Member routes protection (Supabase Auth Only)
    const isMemberPage = request.nextUrl.pathname.startsWith('/member') &&
        !request.nextUrl.pathname.startsWith('/member/login') &&
        !request.nextUrl.pathname.startsWith('/member/activate') &&
        !request.nextUrl.pathname.startsWith('/member/forgot-password') &&
        !request.nextUrl.pathname.startsWith('/member/update-password')

    const isMemberLoginPage = request.nextUrl.pathname.startsWith('/member/login')

    if (isMemberPage) {
        if (user) {
            return supabaseResponse
        }
        const url = request.nextUrl.clone()
        url.pathname = '/member/login'
        return NextResponse.redirect(url)
    }

    if (isMemberLoginPage && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/member/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
