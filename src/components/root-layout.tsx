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
import { LoginModal } from "@/components/login-modal";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const isSignedIn = !!session;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="container flex h-16 items-center">
          <div className="mr-4 flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Image src="/logo.png" alt="Logo" width={32} height={32} />
              <span className="hidden md:inline-block font-medium text-lg">
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
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none hover:bg-[#2A2A2A] hover:text-white text-gray-400 h-9 w-9 px-0"
                >
                  <Github className="h-5 w-5" />
                </Link>
                <GitHubStats />
              </div>

              {isSignedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-2">
                      <Avatar className="h-9 w-9 border border-[#333]">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                        <AvatarFallback className="bg-[#2A3B5C] text-white">
                          {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-[#1C1C1C] border-[#2A2A2A] text-white">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {session.user.name && <p className="font-medium">{session.user.name}</p>}
                        {session.user.email && (
                          <p className="w-[200px] truncate text-sm text-gray-400">
                            {session.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-[#2A2A2A]" />
                    <DropdownMenuItem 
                      onClick={() => signOut()} 
                      className="text-red-500 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <LoginModal />
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
