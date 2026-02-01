import { redirect } from "next/navigation";
import { auth } from "./auth";
import { Role } from "../../../prisma/generated/prisma/enums";
import { prisma } from "../prisma";

const REDIRECT_ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  login: (callbackUrl?: string) =>
    callbackUrl ? `/login?callbackUrl=${callbackUrl}` : "/login",
};

export async function requireAnonymous(redirectUrl?: string) {
  const session = await auth();

  if (session) {
    redirect(redirectUrl || REDIRECT_ROUTES.dashboard);
  }
}

export async function requireAuth(callbackUrl?: string, allowedRoles?: Role[]) {
  const session = await auth();

  if (!session) {
    redirect(REDIRECT_ROUTES.login(callbackUrl));
  }

  if (!allowedRoles) {
    return session;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!(user!.role in allowedRoles)) {
    redirect(callbackUrl || REDIRECT_ROUTES.dashboard);
  }

  return session;
}
