'use client';

import { SignInButton, SignOutButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/hooks/use-auth";

export function UserNav() {
  const { isSignedIn, isGuest } = useAuth();

  if (!isSignedIn && !isGuest) {
    return (
      <SignInButton mode="modal">
        <Button variant="outline">Sign In</Button>
      </SignInButton>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={isGuest ? undefined : "/avatar.png"} alt="Avatar" />
            <AvatarFallback>{isGuest ? "G" : "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {isGuest ? "Guest User" : "User"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!isGuest && (
          <DropdownMenuItem>
            <SignOutButton>Sign out</SignOutButton>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
