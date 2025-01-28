"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, LogIn } from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const isDev = process.env.NODE_ENV === 'development';
  // Skip auth check in development
  const isSignedIn = isDev ? true : useAuth().isSignedIn;

  // Development mode placeholder for UserButton
  const DevUserButton = () => (
    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
      <Settings className="w-5 h-5" />
    </Button>
  );

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A]">
      {/* Global Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-[#2A2A2A]">
        <div className="flex items-center">
          <Link href="/">
            <h1 className="text-xl font-semibold text-white">OpenBookLM</h1>
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          {isSignedIn ? (
            <>
              {isDev ? <DevUserButton /> : (
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                    },
                  }}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </>
          ) : (
            isDev ? (
              <Button
                variant="outline"
                size="sm"
                className="text-gray-200 hover:text-white"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-gray-200 hover:text-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </SignInButton>
            )
          )}
        </div>
      </header>

      {/* Main Content */}
      {isSignedIn ? (
        <main className="flex-1 overflow-y-auto">{children}</main>
      ) : (
        <div className="flex items-center justify-center flex-1">
          <div className="max-w-md mx-auto px-4 py-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Welcome to OpenBookLM
              </h2>
              <p className="text-gray-400 mb-8">
                Sign in to start creating notebooks and having meaningful
                conversations.
              </p>
              <div className="flex flex-col space-y-4 w-64 mx-auto">
                {isDev ? (
                  <Button
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Sign In
                  </Button>
                ) : (
                  <SignInButton mode="modal">
                    <Button
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Sign In
                    </Button>
                  </SignInButton>
                )}
                {isDev ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-[#333333] hover:bg-[#2A2A2A] text-gray-200"
                  >
                    Sign Up
                  </Button>
                ) : (
                  <SignInButton mode="modal">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full border-[#333333] hover:bg-[#2A2A2A] text-gray-200"
                    >
                      Sign Up
                    </Button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
