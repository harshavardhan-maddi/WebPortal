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
  Globe,
  Sparkles,
  Key
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background mesh effect */}
      <div className="mesh-gradient">
        <div className="mesh-blob bg-cyan-500/10 top-[-10%] left-[-10%]" />
        <div className="mesh-blob bg-purple-500/10 bottom-[-10%] right-[-10%] delay-700" />
      </div>

      {/* Floating Header Actions (Admin Login as key emblem) */}
      <div className="fixed top-8 right-28 md:right-36 z-50">
        <Link href="/auth/login" title="Admin Portal Access">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-[#06070c]/60 border border-white/10 hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-white shadow-2xl backdrop-blur-md cursor-pointer transition-all relative overflow-hidden group"
          >
            {/* Pulsing glow inside */}
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Key className="w-5 h-5 group-hover:scale-110 group-hover:text-primary transition-transform duration-300" />
          </motion.div>
        </Link>
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

          {/* Ultra Premium Center Launch Button */}
          <div className="flex justify-center mt-6">
            <Link href="/quiz/auth">
              <motion.div
                className="relative inline-block group cursor-pointer"
                whileHover="hover"
                whileTap="tap"
              >
                {/* Dynamic Cyber Ambient Glow */}
                <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-emerald-500 to-cyan-500 rounded-full blur-xl opacity-35 group-hover:opacity-65 group-hover:scale-105 transition duration-500" />
                
                {/* Premium Main Button Container */}
                <motion.button
                  variants={{
                    hover: { scale: 1.05, boxShadow: "0 0 30px rgba(99, 102, 241, 0.3)" },
                    tap: { scale: 0.96 }
                  }}
                  transition={{ type: "spring", stiffness: 450, damping: 14 }}
                  className="relative px-12 py-5 bg-[#06070c]/90 text-white rounded-full font-black text-sm uppercase tracking-[0.25em] border border-white/10 overflow-hidden flex items-center justify-center gap-3 shadow-2xl backdrop-blur-md"
                >
                  {/* Sweep-across shine animation */}
                  <motion.span 
                    variants={{
                      hover: {
                        x: ["-120%", "220%"],
                        transition: {
                          repeat: Infinity,
                          duration: 1.6,
                          ease: "linear"
                        }
                      }
                    }}
                    className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" 
                  />

                  {/* Sparkles icon */}
                  <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
                  
                  <span>Start Assessment</span>

                  <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1.5 transition-transform duration-300" />
                </motion.button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

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
