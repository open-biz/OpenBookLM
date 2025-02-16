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
            <nav className="flex items-center space-x-2">
              <Link
                href="https://github.com/open-biz/OpenBookLM"
                target="_blank"
                rel="noreferrer"
              >
                <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 py-2 w-9 px-0">
                  <Github className="h-5 w-5" />
                </div>
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hidden md:flex items-center gap-2"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
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
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <div className="h-full py-6 pl-8 pr-6 lg:py-8">
            <GuestModeIndicator />
            <CreditStatus />
            <GitHubStats />
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
