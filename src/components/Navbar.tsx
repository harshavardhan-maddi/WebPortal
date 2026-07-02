"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Download } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

export default function Navbar() {
  const { isInstallable, installApp } = usePWA();

  return (
    <div className="fixed top-8 left-8 z-50 flex flex-col gap-4">
      <Link href="/">
        <motion.button
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center text-cyber-blue shadow-lg shadow-black/40 group relative overflow-hidden"
          title="Home"
        >
          <div className="absolute inset-0 bg-cyber-blue/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Home className="w-7 h-7 relative z-10" />
        </motion.button>
      </Link>

      <AnimatePresence>
        {isInstallable && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -20 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={installApp}
            className="w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center text-emerald-400 shadow-lg shadow-black/40 group relative overflow-hidden"
            title="Install App"
          >
            <div className="absolute inset-0 bg-emerald-400/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Download className="w-7 h-7 relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

