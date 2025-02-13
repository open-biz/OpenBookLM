"use client";

import { useAuth as useClerkAuth } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export function useAuth() {
  const clerkAuth = useClerkAuth();
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    // Check for guest session cookie
    const guestSessionId = document.cookie
      .split("; ")
      .find(row => row.startsWith("guest_session_id="))
      ?.split("=")[1];

    if (guestSessionId) {
      setIsGuest(true);
      setGuestId(guestSessionId);
    }
  }, []);

  if (isGuest) {
    return {
      userId: guestId,
      isGuest: true,
      isSignedIn: true,
      isLoaded: true,
    };
  }

  return clerkAuth;
}
