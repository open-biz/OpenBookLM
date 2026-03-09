import { Inter } from "next/font/google";
import "./globals.css";
import { RootLayout } from "@/components/root-layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OpenBookLM",
  description: "Open source version of OpenBookLM",
  icons: {
    icon: '/favicon.ico',
    apple: '/logo.png',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#1A1A1A] text-white`}>
        <RootLayout>{children}</RootLayout>
      </body>
    </html>
  );
}
