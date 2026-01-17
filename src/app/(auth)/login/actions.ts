'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    // Validate form data
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const validation = loginSchema.safeParse({ email, password })

    if (!validation.success) {
        return { error: 'Invalid inputs' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Fetch user role to redirect appropriately
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'coach'

    // Clear cache to ensure dashboard layout fetches fresh profile data
    revalidatePath('/', 'layout')
    revalidatePath('/admin', 'layout')
    revalidatePath('/coach', 'layout')

    if (role === 'admin') {
        redirect('/admin')
    } else {
        redirect('/coach')
    }
}
