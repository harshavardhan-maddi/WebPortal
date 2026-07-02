import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import CollegeLogo from "@/components/CollegeLogo";
import IntroSplash from "@/components/IntroSplash";
import PWARegister from "@/components/PWARegister";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Techno Elite Web Portal | Advanced Assessment Platform",
  description: "Advanced Assessment Platform for Future Tech Professionals. Cyber Security, FSD, AI & ML, and Data Science quizzes.",
  keywords: ["Quiz", "Assessment", "Cyber Security", "FSD", "AI", "ML", "Data Science", "Techno Elite"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} selection:bg-cyan-500/30`}>
        <PWARegister />
        <IntroSplash />
        <CollegeLogo />
        <Navbar />
        <main>{children}</main>
        <Toaster />
        <footer className="py-10 text-center border-t border-white/5 mt-20">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Techno Elite Web Portal. All rights reserved.
          </p>
        </footer>
      </body>
    </html>
  );
}

