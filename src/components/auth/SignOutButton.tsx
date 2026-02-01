"use client";

import { signOutAction } from "@/actions/auth";
import { useState } from "react";

interface SignOutButtonProps {
  className?: string;
  children?: (isLoading: boolean) => React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function onClick() {
    setIsLoading(true);
    await signOutAction();
  }

  return (
    <button onClick={onClick} disabled={isLoading} className={className}>
      {children
        ? children(isLoading)
        : isLoading
          ? "Signing Out..."
          : "Sign Out"}
    </button>
  );
}
