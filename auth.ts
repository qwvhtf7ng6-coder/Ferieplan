import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 timers session
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase().trim() },
        });

        if (!user) return null;

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null; // Still locked
        }

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) {
          // Increment failed attempts
          const newAttempts = (user.loginAttempts ?? 0) + 1;
          const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: newAttempts,
              lockedUntil: shouldLock
                ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                : null,
            },
          });
          return null;
        }

        // Successful login — reset counter
        if (user.loginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { loginAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
          canManageShifts: user.canManageShifts,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutter
      const now = Date.now();

      if (user) {
        // Første login: gem fra user-objektet
        token.id = user.id;
        token.role = (user as any).role;
        token.departmentId = (user as any).departmentId;
        token.canManageShifts = (user as any).canManageShifts;
        token.profileCachedAt = now;
      } else if (token.id) {
        const lastCached = (token.profileCachedAt as number) ?? 0;
        const cacheExpired = now - lastCached > CACHE_TTL_MS;

        if (cacheExpired) {
          // Cache udløbet — hent frisk fra DB (max hvert 5. min)
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, departmentId: true, canManageShifts: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.departmentId = dbUser.departmentId;
            token.canManageShifts = dbUser.canManageShifts;
            token.profileCachedAt = now;
          } else {
            // Bruger slettet — invalider token
            return null as any;
          }
        }
        // Hvis cache ikke er udløbet: brug token som det er (ingen DB-query)
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).departmentId = token.departmentId;
        (session.user as any).canManageShifts = token.canManageShifts;
      }
      return session;
    },
  },
});
