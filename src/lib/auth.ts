import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db';

interface DbUser {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  is_admin: number;
  is_active: number;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = db
          .prepare('SELECT * FROM users WHERE email = ?')
          .get(credentials.email) as DbUser | undefined;

        if (!user) {
          return null;
        }

        // Check if user is deactivated
        if (user.is_active === 0) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);

        if (!isValid) {
          return null;
        }

        // Record login in history and update last_login timestamp
        const loginId = uuidv4();
        db.prepare(
          'INSERT INTO login_history (id, user_id, logged_in_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
        ).run(loginId, user.id);
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.is_admin === 1,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      // Refresh admin status on session update
      if (trigger === 'update') {
        const dbUser = db
          .prepare('SELECT is_admin FROM users WHERE id = ?')
          .get(token.id) as { is_admin: number } | undefined;
        if (dbUser) {
          token.isAdmin = dbUser.is_admin === 1;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
};
