"use client";

import { signOutAction } from "@/app/actions/auth";

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  return (
    <form action={signOutAction}>
      <button type="submit" className={className}>
        {children ?? "Sign Out"}
      </button>
    </form>
  );
}
