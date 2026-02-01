import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { auth } from "@/lib/auth/auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "time2meet - Find the Perfect Meeting Time",
  description:
    "Easily coordinate meeting times with your team. Create availability polls and find when everyone is free.",
  keywords: [
    "meeting",
    "scheduling",
    "availability",
    "calendar",
    "coordination",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-gray-50 min-h-screen`}
      >
        <Navbar session={session} />
        <main className="animate-fade-in">{children}</main>
      </body>
    </html>
  );
}
