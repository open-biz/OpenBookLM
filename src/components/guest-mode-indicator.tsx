"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { User } from "@prisma/client";
import { mockUser } from "@/lib/mock-data";

export function GuestModeIndicator() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Simulate API call with mock data
    const fetchUser = async () => {
      try {
        // In production, this would be a real API call
        // const response = await fetch("/api/user");
        // const data = await response.json();
        setUser(mockUser as User);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, []);

  if (!user?.isGuest) {
    return null;
  }

  return (
    <Alert className="mb-4">
      <AlertTitle>Guest Mode</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <p>
          You are currently using OpenBookLM in guest mode. This means you have
          limited access to features and credits. Sign in to unlock full
          functionality:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Increased audio generation limits</li>
          <li>Larger context windows</li>
          <li>Advanced document formats</li>
          <li>30-day history retention</li>
        </ul>
        <div className="flex justify-end">
          <SignInButton mode="modal">
            <Button variant="default">Sign In</Button>
          </SignInButton>
        </div>
      </AlertDescription>
    </Alert>
  );
}
