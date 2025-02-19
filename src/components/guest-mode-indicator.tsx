"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SignInButton } from "@clerk/nextjs";
import { User } from "@prisma/client";

export function GuestModeIndicator() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/user");
        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }
        const data = await response.json();
        setUser(data);
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
          limited access to features and credits:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Audio Generation: 10 credits</li>
          <li>Document Processing: 20 credits</li>
          <li>Context Window: 4,000 tokens</li>
          <li>7-day history retention</li>
        </ul>
        <div className="flex justify-end">
          <SignInButton mode="modal">
            <Button variant="default">Sign In for More Credits</Button>
          </SignInButton>
        </div>
      </AlertDescription>
    </Alert>
  );
}
