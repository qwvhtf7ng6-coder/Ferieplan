import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getEffectivePermissions } from "@/lib/can";

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
        email:    { label: "Email",        type: "email" },
        password: { label: "Password",     type: "password" },
        orgSlug:  { label: "Organisation", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const orgSlug = (credentials.orgSlug as string | undefined)?.trim() ?? null;

        let user;

        if (orgSlug) {
          // Normal login — find org, derefter bruger via composite unique
          const org = await prisma.organization.findUnique({
            where: { slug: orgSlug },
            select: { id: true, status: true },
          });
          if (!org || org.status !== "ACTIVE") return null;

          user = await prisma.user.findFirst({
            where: { email, organizationId: org.id },
          });
        } else {
          // SUPER_ADMIN login — ingen org
          user = await prisma.user.findFirst({
            where: { email, organizationId: null, role: "SUPER_ADMIN" },
          });
        }

        if (!user) return null;

        // Check om kontoen er låst
        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password);

        if (!valid) {
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

        // Succesfuldt login — nulstil tæller
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
          organizationId: user.organizationId,
          orgSlug: orgSlug,
          departmentId: user.departmentId,
          canManageShifts: user.canManageShifts,
          permissions: getEffectivePermissions(user.role, user.permissions, {
            canManageShifts: user.canManageShifts,
          }),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutter
      const now = Date.now();

      if (user) {
        // Første login
        token.id             = user.id;
        token.role           = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.orgSlug        = (user as any).orgSlug;
        token.departmentId   = (user as any).departmentId;
        token.canManageShifts = (user as any).canManageShifts;
        token.permissions    = (user as any).permissions;
        token.isSuperAdmin   = (user as any).role === "SUPER_ADMIN";
        token.profileCachedAt = now;
      } else if (token.id) {
        const lastCached = (token.profileCachedAt as number) ?? 0;
        const cacheExpired = now - lastCached > CACHE_TTL_MS;

        if (cacheExpired) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              organizationId: true,
              departmentId: true,
              canManageShifts: true,
              permissions: true,
            },
          });
          if (dbUser) {
            token.role           = dbUser.role;
            token.organizationId = dbUser.organizationId;
            token.departmentId   = dbUser.departmentId;
            token.canManageShifts = dbUser.canManageShifts;
            token.permissions    = getEffectivePermissions(
              dbUser.role,
              dbUser.permissions,
              { canManageShifts: dbUser.canManageShifts }
            );
            token.isSuperAdmin   = dbUser.role === "SUPER_ADMIN";
            token.profileCachedAt = now;
          } else {
            // Bruger slettet — invalider token
            return null as any;
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role           = token.role;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).orgSlug        = token.orgSlug;
        (session.user as any).departmentId   = token.departmentId;
        (session.user as any).canManageShifts = token.canManageShifts;
        (session.user as any).permissions    = token.permissions;
        (session.user as any).isSuperAdmin   = token.isSuperAdmin;
      }
      return session;
    },
  },
});
