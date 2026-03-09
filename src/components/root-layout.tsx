"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogIn, Github, LogOut } from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { useSession, signIn, signOut } from "@/lib/auth-client";
import { GitHubStats } from "@/components/github-stats";
import Image from "next/image";
import { CreditStatus } from "@/components/credit-status";
import { GuestModeIndicator } from "@/components/guest-mode-indicator";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const isSignedIn = !!session;

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
              <div className="flex items-center">
                <Link
                  href="https://github.com/open-biz/OpenBookLM"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 py-2 w-9 px-0"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <GitHubStats />
              </div>

              {isSignedIn ? (
                <Button variant="ghost" size="icon" onClick={() => signOut()}>
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => signIn.social({ provider: 'github' })}>
                  <LogIn className="h-5 w-5" />
                </Button>
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
