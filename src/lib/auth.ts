import { NextAuthOptions } from "next-auth"
import LineProvider from "next-auth/providers/line"

export const authOptions: NextAuthOptions = {
    providers: [
        LineProvider({
            clientId: process.env.LINE_CLIENT_ID!,
            clientSecret: process.env.LINE_CLIENT_SECRET!,
            authorization: { params: { scope: 'profile openid email' } },
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
            }
            if (profile) {
                token.email = (profile as any).email
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub
                session.user.email = token.email as string
            }
            return session
        },
    },
    pages: {
        signIn: '/member/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
}
