'use client';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="font-bold text-white hidden sm:block">FX Journal</span>
        </Link>

        <div className="flex items-center gap-4">
          {session?.user && (
            <>
              <span className="text-gray-400 text-sm hidden md:block">
                {session.user.name}
              </span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                {session.user.name?.[0]?.toUpperCase()}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-gray-800"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
