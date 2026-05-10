import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import CollegeLogo from "@/components/CollegeLogo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Techno Elite Web Portal | Advanced Assessment Platform",
  description: "Advanced Assessment Platform for Future Tech Professionals. Cyber Security, FSD, AI & ML, and Data Science quizzes.",
  keywords: ["Quiz", "Assessment", "Cyber Security", "FSD", "AI", "ML", "Data Science", "Techno Elite"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} selection:bg-cyan-500/30`}>
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
