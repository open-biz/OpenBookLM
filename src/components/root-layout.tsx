"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, LogIn, Github } from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import { GitHubStats } from "@/components/github-stats";
import Image from "next/image";
import { CreditStatus } from "@/components/credit-status";
import { GuestModeIndicator } from "@/components/guest-mode-indicator";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const { userId, isSignedIn } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-[#1A1A1A]">
      {/* Global Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="OpenBookLM Logo"
              width={24}
              height={24}
              className="rounded"
            />
            <h1 className="text-lg font-medium text-gray-200">OpenBookLM</h1>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/open-biz/OpenBookLM"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 text-gray-400 hover:text-gray-300"
          >
            <Github className="h-4 w-4" />
            <span className="text-sm font-medium">open-biz/OpenBookLM</span>
            <GitHubStats />
          </a>
          {isSignedIn ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hidden md:flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Button>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                  },
                }}
              />
            </>
          ) : (
            <SignInButton mode="modal">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <LogIn className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sign in</span>
              </Button>
            </SignInButton>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Image src="/logo.png" alt="Logo" width={32} height={32} />
              <span className="hidden font-bold sm:inline-block">
                OpenBookLM
              </span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {userId && <CreateNotebookDialog />}
            </div>
            <nav className="flex items-center space-x-4">
              <CreditStatus />
              <Link
                href="https://github.com/open-biz/OpenBookLM"
                target="_blank"
                rel="noreferrer"
                className="flex items-center"
              >
                <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 py-2 w-9 px-0">
                  <Github className="h-5 w-5" />
                </div>
                <GitHubStats />
              </Link>

              {isSignedIn ? (
                <>
                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9",
                      },
                    }}
                  />
                </>
              ) : (
                <SignInButton mode="modal">
                  <Button variant="ghost" size="icon">
                    <LogIn className="h-5 w-5" />
                  </Button>
                </SignInButton>
              )}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container">
          {userId && <GuestModeIndicator />}
          {children}
        </div>
      </main>
    </div>
  );
}
