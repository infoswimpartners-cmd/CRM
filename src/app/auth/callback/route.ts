import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { linkStudentData } from '@/actions/member/auth'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // Attempt to link student data immediately after login
            const result = await linkStudentData();

            if (result.success) {
                return NextResponse.redirect(`${origin}${next}`)
            } else {
                // Linking failed (no student found)
                console.warn('Linking failed:', result.message);
                // Redirect to error page or linking page
                return NextResponse.redirect(`${origin}/member/link-error?message=${encodeURIComponent(result.message)}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
