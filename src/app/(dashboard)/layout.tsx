import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch profile for role check (optional security enhancement)
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    // Basic role check ensures they are at least authenticated & have a profile
    if (!profile) {
        redirect('/')
    }

    // Type assertion since we know the shape but didn't generate types yet
    const safeProfile = profile as { full_name: string | null; role: string }

    const signOut = async () => {
        'use server'
        const supabase = await createClient()
        await supabase.auth.signOut()
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <header className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="font-bold text-xl text-blue-600 mr-8">
                        Swim Partners
                    </Link>

                    {/* Navigation for Admins */}
                    {safeProfile.role === 'admin' && (
                        <nav className="flex items-center gap-4 mr-auto">
                            <Link
                                href="/admin"
                                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                            >
                                管理者
                            </Link>
                            <Link
                                href="/coach"
                                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                            >
                                コーチ
                            </Link>
                        </nav>
                    )}

                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500 hidden sm:inline">{safeProfile.full_name || user.email}</span>
                        <form action={signOut}>
                            <Button variant="ghost" size="sm">ログアウト</Button>
                        </form>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>
        </div>
    )
}
