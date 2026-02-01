"use server";

import { signIn, signOut } from "@/lib/auth/auth";
import { saltAndHashPassword } from "@/lib/auth/password";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { prisma } from "@/lib/prisma";
import {
  LoginData,
  loginSchema,
  RegisterData,
  registerSchema,
} from "@/validators/auth";
import { z } from "zod";

export type LoginState =
  | (Omit<LoginData, "callbackUrl" | "password"> & { errors?: string[] })
  | null;

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawData = Object.fromEntries(formData) as LoginData;
  const loginData = loginSchema.safeParse(rawData);

  if (!loginData.success) {
    const flattendError = z.flattenError(loginData.error);

    return {
      email: rawData.email,
      errors: flattendError.fieldErrors.email,
    };
  }

  // Validate callback URL - only allow relative paths to prevent open redirect
  const redirectTo = loginData.data.callbackUrl ?? "/dashboard";

  try {
    await signIn("credentials", {
      email: loginData.data.email,
      password: loginData.data.password,
      redirectTo,
    });
  } catch (error) {
    // NextAuth throws a redirect on success - re-throw it
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      return {
        email: rawData.email,
        errors: ["Incorrect email or password"],
      };
    }
    return {
      email: rawData.email,
      errors: ["Something went wrong. Please try again."],
    };
  }

  // Won't reach here on success (redirect throws)
  return null;
}

export type RegisterState =
  | (Omit<RegisterData, "password" | "confirmPassword" | "callbackUrl"> & {
      errors?: string[];
    })
  | null;

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const rawData = Object.fromEntries(formData) as RegisterData;
  const registerData = registerSchema.safeParse(rawData);

  const returnValues = {
    firstName: rawData.firstName,
    lastName: rawData.lastName,
    email: rawData.email,
  };

  if (!registerData.success) {
    return {
      ...returnValues,
      errors: registerData.error.issues.map((issue) => issue.message),
    };
  }

  // Validate callback URL - only allow relative paths to prevent open redirect
  const redirectTo = registerData.data.callbackUrl ?? "/dashboard";

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: registerData.data.email },
    });

    if (existingUser) {
      return {
        errors: ["An account with this email already exists"],
        ...returnValues,
      };
    }

    // Create user
    await prisma.user.create({
      data: {
        email: registerData.data.email,
        firstName: registerData.data.firstName,
        lastName: registerData.data.lastName,
        passwordHash: await saltAndHashPassword(registerData.data.password),
      },
    });

    // Sign in after registration
    await signIn("credentials", {
      email: registerData.data.email,
      password: registerData.data.password,
      redirectTo,
    });
  } catch (error) {
    // NextAuth throws a redirect on success - re-throw it
    if (isRedirectError(error)) {
      throw error;
    }
    if (error instanceof AuthError) {
      // Registration succeeded but sign-in failed - include callback URL in redirect
      const loginUrl = registerData.data.callbackUrl
        ? `/login?registered=true&callbackUrl=${encodeURIComponent(registerData.data.callbackUrl)}`
        : "/login?registered=true";
      redirect(loginUrl);
    }
    console.error("Registration error:", error);
    return {
      errors: ["Something went wrong. Please try again."],
      ...returnValues,
    };
  }

  return null;
}

export async function signOutAction() {
  await signOut();
}
