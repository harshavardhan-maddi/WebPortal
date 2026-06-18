"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  Search, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  Monitor,
  Clock,
  Filter,
  ShieldCheck,
  ChevronRight,
  Wifi,
  WifiOff,
  Circle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function ActiveStatusPage() {
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("3rd Year Super 50");
  const [adminSession, setAdminSession] = useState<any>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (!session.role) {
      window.location.href = "/auth/login";
      return;
    }
    setAdminSession(session);
    
    if (session.role !== "super-admin") {
      setSelectedBatch(session.batch || "3rd Year Super 50");
      if (session.role === "domain-admin") {
        setSelectedDomain(session.domain);
      }
    }
  }, []);



  useEffect(() => {
    const channel = supabase.channel('online-students');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const simplified: Record<string, any> = {};
        
        Object.keys(state).forEach(key => {
          // Presence state returns an array for each key, take the last one
          simplified[key] = state[key][state[key].length - 1];
        });
        
        setPresenceData(simplified);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresenceData(prev => ({ ...prev, [key]: newPresences[0] }));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresenceData(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const students = Object.values(presenceData);
  
  const filteredStudents = students.filter((s: any) => 
    (s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.roll_number?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (s.batch === selectedBatch)
  );


  const stats = {
    total: filteredStudents.length,
    writing: filteredStudents.filter((s: any) => s.status === 'writing').length,
    inPortal: filteredStudents.filter((s: any) => s.status === 'online').length
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
            Active Status <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </h1>
          <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest">
            Real-time Monitoring of Student Presence
          </p>
        </div>

        <div className="flex gap-4">
          <div className="glass px-6 py-3 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Online</p>
              <p className="text-xl font-black text-emerald-400">{stats.total}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase">Writing</p>
              <p className="text-xl font-black text-primary">{stats.writing}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {adminSession?.role === "super-admin" && (
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {["3rd Year Super 50", "4th Year Super 50"].map((batch) => (
              <button
                key={batch}
                onClick={() => {
                  setSelectedBatch(batch);
                  setSelectedDomain(null);
                }}
                className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                  selectedBatch === batch ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'
                }`}
              >
                {batch}
              </button>
            ))}
          </div>
        )}


        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search student..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-1 ring-primary outline-none text-sm" 
          />
        </div>
        


      </div>


      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredStudents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="col-span-full py-20 text-center glass rounded-[3rem] border border-white/5"
            >
              <WifiOff className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No students currently online.</p>
            </motion.div>
          ) : (
            filteredStudents.map((student: any) => (
              <motion.div
                key={student.roll_number}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass p-6 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                      <User className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{student.name}</h3>
                      <p className="text-xs text-muted-foreground font-bold tracking-tighter uppercase">{student.roll_number}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    student.status === 'writing' ? 'bg-primary/10 border-primary/20 text-primary animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  }`}>
                    {student.status === 'writing' ? 'Writing Test' : 'In Portal'}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Domain</span>
                    <span className="font-bold text-primary uppercase tracking-tighter">
                      {student.batch === "4th Year Super 50" ? "General" : student.domain?.replace('-', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Session Start</span>
                    <span className="font-bold text-white">
                      {student.last_seen ? new Date(student.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </span>
                  </div>
                </div>

                {/* Decorative status bar at bottom */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                  student.status === 'writing' ? 'bg-primary' : 'bg-emerald-500'
                }`} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
