import type { NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import pool from '@/lib/db/client'
import type { RowDataPacket } from 'mysql2'

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'kakao') return false

      const kakaoId = account.providerAccountId
      const email = (profile as Record<string, unknown> | undefined)?.email as string | null ?? null
      const nickname = (profile as Record<string, unknown> | undefined)?.name as string | null ?? null

      await pool.execute(
        `INSERT INTO users (id, kakao_id, email, nickname)
         VALUES (UUID(), ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = VALUES(email), nickname = VALUES(nickname)`,
        [kakaoId, email, nickname]
      )
      return true
    },

    async jwt({ token, account }) {
      if (account?.providerAccountId) {
        token.kakaoId = account.providerAccountId
      }
      return token
    },

    async session({ session, token }) {
      if (token.kakaoId) {
        const [rows] = await pool.execute<RowDataPacket[]>(
          'SELECT id FROM users WHERE kakao_id = ?',
          [token.kakaoId as string]
        )
        if (rows.length > 0) {
          session.user.id = rows[0].id as string
          session.user.kakaoId = token.kakaoId as string
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// next-auth 타입 확장
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      kakaoId: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    kakaoId?: string
  }
}
