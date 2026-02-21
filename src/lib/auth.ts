import { NextAuthOptions } from "next-auth"
import LineProvider from "next-auth/providers/line"

export const authOptions: NextAuthOptions = {
    providers: [
        LineProvider({
            clientId: process.env.LINE_CLIENT_ID!,
            clientSecret: process.env.LINE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.sub
            }
            return session
        },
    },
    pages: {
        signIn: '/member/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
}
