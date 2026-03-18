import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient(isRememberMeParam?: boolean) {
    const cookieStore = await cookies()
    const rememberMeCookie = cookieStore.get('sb-remember-me')
    const isRememberMe = isRememberMeParam ?? (rememberMeCookie ? rememberMeCookie.value === 'true' : true)

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            // If not remembering, remove maxAge/expires to make it a session cookie
                            const finalOptions = isRememberMe ? options : { ...options, maxAge: undefined, expires: undefined };
                            cookieStore.set(name, value, finalOptions)
                        })

                        // Store the preference in a cookie so middleware can respect it during refresh
                        cookieStore.set('sb-remember-me', isRememberMe ? 'true' : 'false', {
                            maxAge: isRememberMe ? 60 * 60 * 24 * 30 : undefined, // 30 days or session
                            path: '/',
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
