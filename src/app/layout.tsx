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
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // During development, allow access without auth
  if (process.env.NODE_ENV === 'development') {
    return (
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-[#1A1A1A] text-white`}>
          <RootLayout>{children}</RootLayout>
        </body>
      </html>
    );
  }

  // In production, require auth
  if (!publishableKey) {
    throw new Error('Missing Clerk publishable key');
  }

  return (
    <ClerkProvider 
      publishableKey={publishableKey}
      appearance={{
        baseTheme: 'dark',
        elements: {
          formButtonPrimary: 'bg-blue-500 hover:bg-blue-600',
          card: 'bg-[#1A1A1A]',
          headerTitle: 'text-white',
          headerSubtitle: 'text-gray-400',
          socialButtonsBlockButton: 'border-gray-700 text-white',
          dividerLine: 'bg-gray-700',
          dividerText: 'text-gray-400',
          formFieldLabel: 'text-white',
          formFieldInput: 'bg-[#2A2A2A] border-gray-700 text-white',
          footerActionLink: 'text-blue-400 hover:text-blue-500',
        }
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-[#1A1A1A] text-white`}>
          <RootLayout>{children}</RootLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
