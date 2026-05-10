"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, Rocket } from "lucide-react";

export default function Navbar() {
  return (
    <div className="fixed top-8 left-8 z-50">
      <Link href="/">
        <motion.button
          whileHover={{ scale: 1.1, rotate: -5 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 rounded-2xl glass border border-white/10 flex items-center justify-center text-cyber-blue shadow-lg shadow-black/40 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-cyber-blue/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Home className="w-7 h-7 relative z-10" />
        </motion.button>
      </Link>
    </div>
  );
}
