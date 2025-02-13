'use client';

import { SignInButton } from "@clerk/nextjs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function GuestBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Alert className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[400px] bg-blue-500/10 border-blue-500/20">
      <AlertDescription className="flex items-center justify-between">
        <div className="text-sm text-blue-200">
          You&apos;re using OpenBookLM as a guest. Sign in to keep your notebooks forever!
        </div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="text-blue-200 border-blue-500/20 hover:bg-blue-500/20">
              Sign in
            </Button>
          </SignInButton>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-blue-200 hover:bg-blue-500/20"
            onClick={() => setIsVisible(false)}
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
