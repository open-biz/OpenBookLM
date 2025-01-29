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
  const { isSignedIn } = useAuth();

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
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </>
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
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {!isSignedIn ? (
          <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center p-24">
            <div className="max-w-2xl text-center">
              <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">
                Welcome to OpenBookLM
              </h1>
              <p className="text-xl text-gray-400 mb-12">
                Your AI-powered research companion. Transform content into
                meaningful conversations.
              </p>
              <div className="flex flex-col space-y-4 w-64 mx-auto">
                <SignInButton mode="modal">
                  <Button
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-[#333333] hover:bg-[#2A2A2A] text-gray-200"
                  >
                    Sign Up
                  </Button>
                </SignInButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-56px)] overflow-auto">{children}</div>
        )}
      </main>
    </div>
  );
}
