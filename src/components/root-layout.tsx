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
