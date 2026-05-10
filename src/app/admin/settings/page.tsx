"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Mail, 
  Lock, 
  User,
  Shield,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    domain: "cyber-security"
  });

  // 1. Initial Fetch & Real-time Subscription
  useEffect(() => {
    fetchAdmins();

    const channel = supabase
      .channel('domain_admins_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'domain_admins' }, () => {
        fetchAdmins();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from('domain_admins')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching admins:', error);
    } else {
      setAdmins(data || []);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email || !newAdmin.password) {
      alert("Please fill in all fields");
      return;
    }

    const { error } = await supabase
      .from('domain_admins')
      .insert([{
        ...newAdmin,
        role: "domain-admin"
      }]);

    if (error) {
      alert(`Error creating admin: ${error.message}`);
    } else {
      setIsAddModalOpen(false);
      setNewAdmin({ name: "", email: "", password: "", domain: "cyber-security" });
    }
  };

  const removeAdmin = async (id: string) => {
    if (!confirm("Remove this domain leader?")) return;
    
    const { error } = await supabase
      .from('domain_admins')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error removing admin: ${error.message}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest">Administrative Control & RBAC</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="rounded-xl h-12 gap-2 font-bold px-8 shadow-xl shadow-primary/20">
          <UserPlus className="w-5 h-5" /> Add Domain Leader
        </Button>
      </div>

      {/* Admin List Section */}
      <div className="glass p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">Domain Leaders</h3>
            <p className="text-sm text-muted-foreground">Manage authorized administrators for specific domains</p>
          </div>
        </div>

        <div className="grid gap-4">
          {admins.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
              <Shield className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">No domain leaders created yet.</p>
            </div>
          ) : (
            admins.map((admin) => (
              <motion.div 
                key={admin.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xl">{admin.name}</h4>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {admin.email}</span>
                      <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] uppercase font-black tracking-widest border border-primary/20">
                        {admin.domain.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => removeAdmin(admin.id)} className="w-12 h-12 rounded-2xl text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Add Admin Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg glass p-12 rounded-[3rem] border border-white/10 shadow-2xl">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6">
                  <Shield className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black tracking-tight">Create Domain Leader</h3>
                <p className="text-muted-foreground mt-2 font-medium">Assign a leader to manage a specific tech domain.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Leader Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="John Doe" value={newAdmin.name} onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})} className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Email ID</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="admin@domain.com" value={newAdmin.email} onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})} className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" value={newAdmin.password} onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})} className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Target Domain</Label>
                    <select 
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold outline-none cursor-pointer"
                      value={newAdmin.domain}
                      onChange={(e) => setNewAdmin({...newAdmin, domain: e.target.value})}
                    >
                      <option value="cyber-security">Cyber Security</option>
                      <option value="fsd">Full Stack Development</option>
                      <option value="aiml">AI & ML</option>
                      <option value="data-science">Data Science</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-8">
                  <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">Cancel</Button>
                  <Button onClick={handleAddAdmin} className="flex-1 h-14 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20">Initialize Leader</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
