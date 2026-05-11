"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Search,
  Plus,
  User
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminSession, setAdminSession] = useState<any>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    setAdminSession(session);
  }, []);

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("admin_session");
      window.location.href = "/";
    }
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/admin/super" },
    { name: "Quiz Engine", icon: BookOpen, path: "/admin/quizzes" },
    { name: "Management", icon: Users, path: "/admin/management" },
    { name: "Settings", icon: Settings, path: "/admin/settings" },
  ];


  return (
    <div className="min-h-screen bg-[#05060f] text-white flex">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: isCollapsed ? 100 : 280 }}
        className="h-screen glass border-r border-white/5 sticky top-0 flex flex-col z-30"
      >
        <div className="p-6 mb-8 flex items-center justify-between">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold">T</div>
                <span className="font-bold text-lg">Admin<span className="text-primary">Elite</span></span>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                pathname === item.path ? 'bg-primary/20 text-primary border border-primary/20' : 'hover:bg-white/5 text-muted-foreground'
              }`}>
                <item.icon className="w-6 h-6 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.name}</span>}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            {!isCollapsed && (
              <Link href="/admin/settings" className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors cursor-pointer">

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center text-white font-bold">
                  {adminSession?.name?.[0] || "A"}
                </div>
                <div>
                  <p className="text-sm font-bold truncate max-w-[120px]">{adminSession?.name || "Admin User"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{adminSession?.role?.replace('-', ' ') || "Super Admin"}</p>
                </div>
              </Link>
            )}

            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 p-2 w-full text-red-400 hover:text-red-300 transition-colors group"
            >
              <LogOut className="w-6 h-6 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
              {!isCollapsed && <span className="text-sm font-medium">Logout</span>}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between">
          <div className="flex items-center gap-6 flex-1">
            <h1 className="text-xl font-bold">Overview</h1>
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-12 bg-white/5 border-none rounded-full h-10 focus:ring-1" placeholder="Search data..." />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Elements removed as requested */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto premium-scroll p-8 bg-[#02030a]">
          {children}
        </main>
      </div>
    </div>
  );
}
