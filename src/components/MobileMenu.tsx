"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./auth/SignOutButton";
import type { Session } from "next-auth";
import { Role } from "@/../prisma/generated/prisma/enums";

interface MobileMenuProps {
  session: Session | null;
}

export function MobileMenu({ session }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden flex items-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-white p-2"
          aria-label="Toggle menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg pb-4 px-4 space-y-2">
          <Link
            href="/create"
            className="block bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center"
            onClick={() => setIsOpen(false)}
          >
            Create Meeting
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                className="block text-white/90 hover:text-white transition-colors px-4 py-2 text-center"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
              {session.user?.role === Role.ADMIN && (
                <Link
                  href="/admin"
                  className="block text-white/90 hover:text-white transition-colors px-4 py-2 text-center"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="flex items-center justify-center gap-1">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Admin
                  </span>
                </Link>
              )}
              <div className="text-center text-white/80 text-sm py-2">
                {session.user?.firstName}
                {session.user?.role === Role.ADMIN && (
                  <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </div>
              <SignOutButton className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block text-white/90 hover:text-white transition-colors px-4 py-2 text-center"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="block bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-colors text-center"
                onClick={() => setIsOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
