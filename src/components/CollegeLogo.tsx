"use client";

import React from "react";

export default function CollegeLogo() {
  return (
    <div className="fixed top-8 right-8 z-[60] pointer-events-none select-none">
      <img 
        src="/college_logo.png" 
        alt="NEC College Logo" 
        className="w-24 h-auto md:w-36 object-contain"
        onError={(e) => {
          // Hide if image is missing to prevent broken icon
          (e.target as any).style.display = 'none';
        }}
      />
    </div>
  );
}
