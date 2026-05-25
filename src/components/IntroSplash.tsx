"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function IntroSplash() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Check if intro has already run in this session to avoid excessive repeats
    const hasSeenIntro = sessionStorage.getItem("seen_portal_intro");
    if (hasSeenIntro) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("seen_portal_intro", "true");
    }, 3500); // strictly capped to 3.5 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            transition: { duration: 0.7, ease: [0.76, 0, 0.24, 1] } 
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#06070c] overflow-hidden"
        >
          {/* Cyberpunk grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_50%,transparent_100%)] pointer-events-none" />

          {/* Glowing background highlights */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] bg-primary/20 rounded-full blur-[130px] animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] bg-emerald-500/10 rounded-full blur-[110px] delay-700 animate-pulse" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6">
            {/* Logo box with animated neon spinning border */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 35 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                transition: { 
                  duration: 1, 
                  ease: [0.34, 1.56, 0.64, 1] 
                } 
              }}
              className="relative p-6 rounded-[2.5rem] bg-white/[0.01] border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.02)] backdrop-blur-md flex items-center justify-center"
            >
              {/* Spinning gradient square border */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160">
                <motion.rect
                  x="2"
                  y="2"
                  width="156"
                  height="156"
                  rx="36"
                  fill="none"
                  stroke="url(#neon-glow-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="200 400"
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: -600 }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
                />
                <defs>
                  <linearGradient id="neon-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>

              <motion.img
                src="/college_logo.png"
                alt="College Logo"
                className="w-24 h-24 md:w-32 object-contain"
                initial={{ filter: "brightness(0.7) blur(4px)" }}
                animate={{ 
                  filter: "brightness(1.1) blur(0px)",
                  transition: { delay: 0.4, duration: 0.8 } 
                }}
              />
            </motion.div>

            {/* Glowing Brand text */}
            <div className="text-center space-y-1.5 mt-2">
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { delay: 0.7, duration: 0.8 } 
                }}
                className="text-2xl md:text-3xl font-black uppercase tracking-[0.25em] text-white"
              >
                Techno <span className="cyber-text">Elite</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { delay: 1.1, duration: 0.8 } 
                }}
                className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground"
              >
                Advanced Assessment Platform
              </motion.p>
            </div>

            {/* Premium laser scanner progress line */}
            <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-4 relative border border-white/5">
              <motion.div
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ 
                  duration: 2, 
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 0.2
                }}
                className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
