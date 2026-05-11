"use client";

import React from "react";

export default function CollegeLogo() {
  return (
    <div className="fixed top-8 right-8 z-[60] pointer-events-none select-none">
      <img 
        src="/logo.png" 
        alt="Techno Elite Logo" 
        className="w-20 h-auto md:w-28 object-contain drop-shadow-[0_0_15px_rgba(58,123,213,0.4)]"
        onError={(e) => {
          // Fallback to the original logo if missing
          (e.target as any).src = '/college_logo.png';
        }}
      />
    </div>
  );
}
