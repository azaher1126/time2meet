import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { prisma } from "../prisma";
import { checkPassword } from "./password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {
          type: "email",
          label: "Email",
          placeholder: "johndoe@gmail.com",
        },
        password: {
          type: "password",
          label: "Password",
          placeholder: "*****",
        },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = (credentials.email as string).toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: {
            email: email,
          },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (user.isActive === false) {
          throw new Error("User is deactivated.");
        }

        if (
          (await checkPassword(
            credentials.password as string,
            user.passwordHash,
          )) === false
        ) {
          throw new Error("Invalid credentials");
        }

        await recordLoginHistory(user.id);

        // Return user object without sensitive data (passwordHash)
        // NextAuth will pass this to the jwt callback
        // Note: NextAuth expects id as string internally
        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: async ({ token, user, trigger }) => {
      const extToken = token as JWT;

      // Initial sign in - user object is available from authorize callback
      if (user) {
        extToken.id = user.id;
        extToken.email = user.email!;
        extToken.firstName = user.firstName;
        extToken.lastName = user.lastName;
        extToken.role = user.role;
      }

      // Handle session update trigger - refresh user data from database
      if (trigger === "update" && extToken.id) {
        const dbUser = await prisma.user.findUnique({
          select: {
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
          where: {
            id:
              typeof extToken.id === "number"
                ? extToken.id
                : parseInt(extToken.id, 10),
          },
        });

        if (dbUser) {
          extToken.email = dbUser.email;
          extToken.firstName = dbUser.firstName;
          extToken.lastName = dbUser.lastName;
          extToken.role = dbUser.role;
        }
      }

      return extToken;
    },
    session: async ({ session, token }) => {
      const extToken = token as JWT;

      // Transfer token data to session.user
      if (extToken) {
        session.user = {
          id:
            typeof extToken.id === "number"
              ? extToken.id
              : parseInt(extToken.id, 10),
          email: extToken.email,
          firstName: extToken.firstName,
          lastName: extToken.lastName,
          role: extToken.role,
        } as typeof session.user;
      }
      return session;
    },
  },
});

async function recordLoginHistory(userId: number) {
  await prisma.loginRecord.create({
    data: {
      userId: userId,
    },
  });
}
