"use server";

import { signIn, signOut } from "@/lib/auth/auth";
import { saltAndHashPassword } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";

export type LoginState = {
  error?: string;
  email?: string;
} | null;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = formData.get("callbackUrl") as string | null;

  // Validate callback URL - only allow relative paths to prevent open redirect
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    // NextAuth throws a redirect on success - re-throw it
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Invalid email or password", email };
    }
    return { error: "Something went wrong. Please try again.", email };
  }

  // Won't reach here on success (redirect throws)
  return null;
}

export type RegisterState = {
  error?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
} | null;

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const callbackUrl = formData.get("callbackUrl") as string | null;

  // Validate callback URL - only allow relative paths to prevent open redirect
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";

  // Preserve form data for errors
  const formValues = { email, firstName, lastName };

  // Validation
  if (!firstName || !lastName || !email || !password) {
    return { error: "All fields are required", ...formValues };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match", ...formValues };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters", ...formValues };
  }

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists",
        ...formValues,
      };
    }

    // Create user
    await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        passwordHash: await saltAndHashPassword(password),
      },
    });

    // Sign in after registration
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    // NextAuth throws a redirect on success - re-throw it
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      // Registration succeeded but sign-in failed - include callback URL in redirect
      const loginUrl = callbackUrl
        ? `/login?registered=true&callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "/login?registered=true";
      redirect(loginUrl);
    }
    console.error("Registration error:", error);
    return { error: "Something went wrong. Please try again.", ...formValues };
  }

  return null;
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
