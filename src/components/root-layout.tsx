"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Settings, LogIn, Github } from "lucide-react";
import { CreateNotebookDialog } from "@/components/create-notebook-dialog";
import { SignInButton, useAuth, UserButton } from "@clerk/nextjs";
import { GitHubStats } from "@/components/github-stats";
import Image from "next/image";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const { isSignedIn } = useAuth();

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
    </div>
  );
}
