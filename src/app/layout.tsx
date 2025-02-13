import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";
import { isGuestSession } from "@/lib/guest-utils";
import { GuestBanner } from "@/components/guest-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OpenBookLM",
  description: "Open source version of OpenBookLM",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isGuest = await isGuestSession();

  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-[#1A1A1A] text-white", inter.className)}>
        {isGuest ? (
          <>
            {children}
            <GuestBanner />
          </>
        ) : (
          <ClerkProvider>
            {children}
          </ClerkProvider>
        )}
      </body>
    </html>
  );
}
