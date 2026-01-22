'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="flex items-center space-x-2 text-white font-bold text-xl hover:opacity-90 transition-opacity"
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>time2meet</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/create"
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Create Meeting
            </Link>
            {status === 'loading' ? (
              <div className="w-20 h-8 bg-white/20 rounded-lg animate-pulse" />
            ) : session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-white/90 hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                {session.user?.isAdmin && (
                  <Link
                    href="/admin"
                    className="text-white/90 hover:text-white transition-colors flex items-center gap-1"
                  >
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
                  </Link>
                )}
                <div className="flex items-center space-x-3">
                  <span className="text-white/80 text-sm">
                    {session.user?.name}
                    {session.user?.isAdmin && (
                      <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-white/90 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
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
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/create"
              className="block bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors text-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Create Meeting
            </Link>
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-white/90 hover:text-white transition-colors px-4 py-2 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {session.user?.isAdmin && (
                  <Link
                    href="/admin"
                    className="block text-white/90 hover:text-white transition-colors px-4 py-2 text-center"
                    onClick={() => setMobileMenuOpen(false)}
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
                  {session.user?.name}
                  {session.user?.isAdmin && (
                    <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-white/90 hover:text-white transition-colors px-4 py-2 text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="block bg-white text-indigo-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium transition-colors text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
