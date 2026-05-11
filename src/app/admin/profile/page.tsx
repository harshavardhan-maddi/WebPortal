"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Mail, 
  Lock, 
  Shield, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const [admin, setAdmin] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (session.id) {
      fetchAdminData(session.id, session.role);
    }
  }, []);

  const fetchAdminData = async (id: string, role: string) => {
    if (role === "super-admin") {
      setAdmin({
        id,
        name: "Super Admin",
        email: "amcd@nrtec.in",
        domain: "all",
        role: "super-admin"
      });
      return;
    }

    const { data, error } = await supabase
      .from('domain_admins')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setAdmin(data);
      fetchPendingRequest(data.id);
    }
  };

  const fetchPendingRequest = async (leaderId: string) => {
    const { data, error } = await supabase
      .from('leader_change_requests')
      .select('*')
      .eq('leader_id', leaderId)
      .eq('status', 'pending')
      .maybeSingle();
    
    setPendingRequest(data);
  };

  const handleSubmitRequest = async () => {
    if (!requestData.email && !requestData.password) {
      alert("Please enter either a new email or password");
      return;
    }

    setIsLoading(true);
    const type = requestData.email && requestData.password ? 'both' : requestData.email ? 'email' : 'password';

    const { error } = await supabase
      .from('leader_change_requests')
      .insert([{
        leader_id: admin.id,
        leader_name: admin.name,
        type,
        new_email: requestData.email || null,
        new_password: requestData.password || null,
        status: 'pending'
      }]);

    if (error) {
      alert(`Error submitting request: ${error.message}`);
    } else {
      setIsRequestModalOpen(false);
      setRequestData({ email: "", password: "" });
      fetchPendingRequest(admin.id);
    }
    setIsLoading(false);
  };

  if (!admin) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight">Admin Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest">Manage your administrative identity</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Info */}
        <div className="md:col-span-2 space-y-8">
          <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[2rem] bg-primary/20 flex items-center justify-center text-primary">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{admin.name}</h2>
                <p className="text-primary font-black uppercase tracking-tighter text-sm">{admin.role?.replace('-', ' ')}</p>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Current Email</Label>
                <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-lg">
                  <Mail className="w-5 h-5 mr-4 text-muted-foreground" /> {admin.email}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Current Domain</Label>
                <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-lg capitalize">
                  <Shield className="w-5 h-5 mr-4 text-muted-foreground" /> {admin.domain.replace('-', ' ')}
                </div>
              </div>
            </div>

            {admin.role === "domain-admin" && (
              <div className="pt-4">
                <Button 
                  onClick={() => setIsRequestModalOpen(true)}
                  disabled={!!pendingRequest}
                  className="h-14 w-full rounded-2xl font-bold text-lg gap-2 shadow-xl shadow-primary/20"
                >
                  <Send className="w-5 h-5" /> {pendingRequest ? "Request Pending Approval" : "Request Credential Change"}
                </Button>
                {pendingRequest && (
                  <p className="text-center text-xs text-orange-400 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" /> You have a pending request. Please wait for Super Admin approval.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Request Status (if any) */}
        <div className="space-y-8">
           {pendingRequest ? (
             <div className="glass p-8 rounded-[2.5rem] border border-orange-500/20 bg-orange-500/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg text-orange-400">Pending Request</h3>
                </div>
                <div className="space-y-4">
                  {pendingRequest.new_email && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">New Email</p>
                      <p className="font-bold">{pendingRequest.new_email}</p>
                    </div>
                  )}
                  {pendingRequest.new_password && (
                    <div>
                      <p className="text-[10px] font-black uppercase text-muted-foreground">New Password</p>
                      <p className="font-bold">•••••••• (Hidden)</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-muted-foreground">Submitted on {new Date(pendingRequest.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
             </div>
           ) : (
             <div className="glass p-8 rounded-[2.5rem] border border-white/5 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-lg">Account Secure</h3>
                <p className="text-sm text-muted-foreground">Your account is active and verified by the system.</p>
             </div>
           )}
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRequestModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-lg glass p-12 rounded-[3rem] border border-white/10 shadow-2xl">
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-3xl font-black tracking-tight">Request Change</h3>
                <p className="text-muted-foreground mt-2 font-medium">Your request will be sent to the Super Admin for approval.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">New Email (Optional)</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="new-email@domain.com" value={requestData.email} onChange={(e) => setRequestData({...requestData, email: e.target.value})} className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">New Password (Optional)</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="password" placeholder="••••••••" value={requestData.password} onChange={(e) => setRequestData({...requestData, password: e.target.value})} className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl" />
                  </div>
                </div>

                <div className="flex gap-4 pt-8">
                  <Button variant="ghost" onClick={() => setIsRequestModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">Cancel</Button>
                  <Button onClick={handleSubmitRequest} disabled={isLoading} className="flex-1 h-14 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20">
                    {isLoading ? "Submitting..." : "Send Request"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
