"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Shield, 
  Layout, 
  Brain, 
  Database, 
  ArrowRight, 
  Instagram, 
  Facebook, 
  Globe 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background mesh effect */}
      <div className="mesh-gradient">
        <div className="mesh-blob bg-cyan-500/10 top-[-10%] left-[-10%]" />
        <div className="mesh-blob bg-purple-500/10 bottom-[-10%] right-[-10%] delay-700" />
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-32 pb-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="px-4 py-1.5 rounded-full glass border border-white/10 text-cyber-blue text-sm font-medium mb-6 inline-block">
            Next Generation Assessment
          </span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
            Techno Elite <br />
            <span className="cyber-text">Web Portal</span>
          </h1>
          
          <div className="mb-10" />

          <div className="flex flex-wrap justify-center gap-6">
            <Link href="/quiz/auth">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(58,123,213,0.4)]"
              >
                Start Quiz <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <Link href="/auth/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 glass rounded-full font-semibold border border-white/10 hover:bg-white/10"
              >
                Admin Login
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Domains Section Removed */}

      {/* Social Connectivity Section */}
      <section className="container mx-auto px-6 py-20 text-center relative z-10">
        <div className="p-12 rounded-[3.5rem] glass border border-white/5 space-y-12 bg-white/[0.02]">
          <div>
            <h2 className="text-3xl font-bold">Connect With Us</h2>
            <p className="text-muted-foreground mt-2 text-sm">Stay updated with the latest from TechnoElite and NRTEC</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-10 md:gap-16">
            <a 
              href="https://www.instagram.com/technoelite__amcd?igsh=c3A5YmdiejJmOTJ5" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-pink-500/10 flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-pink-500/40">
                <Instagram className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover:text-white transition-colors">TechnoElite</span>
            </a>

            <a 
              href="https://www.instagram.com/nrtec?igsh=MW1uc3V4MWNhZnhjcw==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-orange-500/10 flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-orange-500/40">
                <Instagram className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover:text-white transition-colors">NRTEC Insta</span>
            </a>

            <a 
              href="https://www.facebook.com/share/18aj3GAhVb/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg group-hover:shadow-blue-600/40">
                <Facebook className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover:text-white transition-colors">NRTEC FB</span>
            </a>

            <a 
              href="https://nrtec.in" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-4 group"
            >
              <div className="w-20 h-20 rounded-[2rem] bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-cyan-500/40">
                <Globe className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground group-hover:text-white transition-colors">Website</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
