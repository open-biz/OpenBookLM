'use client';

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks/use-auth";

interface AuthButtonProps {
  mode?: "modal" | "redirect";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  children?: React.ReactNode;
}

export function AuthButton({ 
  mode = "modal",
  variant = "default",
  size = "default",
  className = "",
  children
}: AuthButtonProps) {
  const { isGuest } = useAuth();

  // If we're in guest mode, render a regular button that will be wrapped by ClerkProvider
  if (isGuest) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
      >
        {children || "Sign in"}
      </Button>
    );
  }

  // For non-guest mode, use the Clerk SignInButton
  return (
    <SignInButton mode={mode}>
      <Button
        variant={variant}
        size={size}
        className={className}
      >
        {children || "Sign in"}
      </Button>
    </SignInButton>
  );
}
