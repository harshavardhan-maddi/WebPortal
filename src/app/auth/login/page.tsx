"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, Rocket, AlertCircle, ChevronRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Real Authentication logic
    setTimeout(() => {
      const email = (e.target as any).email.value;
      const password = (e.target as any).password.value;
      
      // 1. SUPER ADMIN CHECK (Hardcoded master)
      if (email === "amcd@nrtec.in" && password === "nrtec@technoelite") {
        localStorage.setItem("admin_session", JSON.stringify({
          role: "super-admin",
          name: "Super Admin",
          domain: "all"
        }));
        router.push("/admin/super");
        return;
      }

      // 2. DOMAIN ADMIN CHECK (Dynamic from Settings)
      const admins = JSON.parse(localStorage.getItem("domain_admins") || "[]");
      const foundAdmin = admins.find((a: any) => a.email === email && a.password === password);
      
      if (foundAdmin) {
        localStorage.setItem("admin_session", JSON.stringify({
          role: "domain-admin",
          name: foundAdmin.name,
          domain: foundAdmin.domain
        }));
        router.push("/admin/super");
      } else {
        setError("Invalid credentials. Access Denied.");
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="mesh-gradient opacity-30" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Admin Portal</h1>
            <p className="text-muted-foreground mt-2">Secure access for assessment managers</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
              >
                <AlertCircle className="w-4 h-4" /> {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label className="ml-1 text-muted-foreground">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  name="email"
                  type="email" 
                  placeholder="admin@technoelite.com" 
                  required 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <Label className="text-muted-foreground">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  name="password"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-12 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
