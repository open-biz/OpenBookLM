import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { RootLayout } from "@/components/root-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OpenBookLM",
  description: "AI-powered notebook application",
};

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Layout({ children }: { children: React.ReactNode }) {
  // Skip Clerk provider during build time or if keys are missing
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  if (process.env.NODE_ENV === 'development' || !publishableKey) {
    return (
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-[#1A1A1A] text-white`}>
          <RootLayout>{children}</RootLayout>
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-[#1A1A1A] text-white`}>
          <RootLayout>{children}</RootLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
