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
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  ShieldAlert
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
  const [requests, setRequests] = useState<any[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"general" | "security">("general");
  const [session, setSession] = useState<any>(null);
  
  // Profile/Request states for leaders
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // 1. Initial Fetch & Real-time Subscription
  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("admin_session") || "{}");
    setSession(s);
    
    if (s.role === "super-admin") {
      fetchAdmins();
      fetchRequests();
      setActiveTab("general");
    } else {
      fetchAdminProfile(s.id);
      setActiveTab("security");
    }

    const adminChannel = supabase
      .channel('domain_admins_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'domain_admins' }, () => {
        if (s.role === "super-admin") fetchAdmins();
        else fetchAdminProfile(s.id);
      })
      .subscribe();

    const requestChannel = supabase
      .channel('leader_change_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leader_change_requests' }, () => {
        if (s.role === "super-admin") fetchRequests();
        else fetchPendingRequest(s.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(adminChannel);
      supabase.removeChannel(requestChannel);
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

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('leader_change_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching requests:', error);
    } else {
      setRequests(data || []);
    }
  };

  const handleRequestAction = async (request: any, action: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return;

    if (action === 'approved') {
      const updates: any = {};
      if (request.type === 'email' || request.type === 'both') updates.email = request.new_email;
      if (request.type === 'password' || request.type === 'both') updates.password = request.new_password;

      const { error: updateError } = await supabase
        .from('domain_admins')
        .update(updates)
        .eq('id', request.leader_id);

      if (updateError) {
        alert(`Error updating leader credentials: ${updateError.message}`);
        return;
      }
    }

    const { error: requestError } = await supabase
      .from('leader_change_requests')
      .update({ status: action })
      .eq('id', request.id);

    if (requestError) {
      alert(`Error updating request: ${requestError.message}`);
    } else {
      fetchRequests();
      fetchAdmins();
    }
  };

  const fetchAdminProfile = async (id: string) => {
    const { data } = await supabase.from('domain_admins').select('*').eq('id', id).single();
    if (data) {
      setAdminProfile(data);
      fetchPendingRequest(data.id);
    }
  };

  const fetchPendingRequest = async (leaderId: string) => {
    const { data } = await supabase
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
    const { error } = await supabase.from('leader_change_requests').insert([{
      leader_id: session.id,
      leader_name: adminProfile.name,
      type,
      new_email: requestData.email || null,
      new_password: requestData.password || null,
      status: 'pending'
    }]);
    if (error) alert(`Error: ${error.message}`);
    else {
      setIsRequestModalOpen(false);
      setRequestData({ email: "", password: "" });
      fetchPendingRequest(session.id);
    }
    setIsLoading(false);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm uppercase tracking-widest">
            {session?.role === "super-admin" ? "Administrative Control & RBAC" : "Manage Your Account Security"}
          </p>
        </div>
        
        {session?.role === "super-admin" && (
          <Button onClick={() => setIsAddModalOpen(true)} className="rounded-xl h-12 gap-2 font-bold px-8 shadow-xl shadow-primary/20">
            <UserPlus className="w-5 h-5" /> Add Domain Leader
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 pb-1">
        {session?.role === "super-admin" && (
          <button 
            onClick={() => setActiveTab("general")}
            className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === "general" ? "text-primary" : "text-muted-foreground hover:text-white"}`}
          >
            General Management
            {activeTab === "general" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        )}
        <button 
          onClick={() => setActiveTab("security")}
          className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === "security" ? "text-primary" : "text-muted-foreground hover:text-white"}`}
        >
          {session?.role === "super-admin" ? "My Profile" : "Account Security"}
          {activeTab === "security" && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "general" && session?.role === "super-admin" && (
          <motion.div 
            key="general" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-10"
          >
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
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {admin.email}</span>
                            <span className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors" onClick={() => setShowPasswords(prev => ({...prev, [admin.id]: !prev[admin.id]}))}>
                              <Lock className="w-3.5 h-3.5" /> {showPasswords[admin.id] ? admin.password : "••••••••"}
                            </span>
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

            {/* Pending Requests Section */}
            <div className="glass p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Pending Change Requests</h3>
                  <p className="text-sm text-muted-foreground">Approve or reject credential change requests from domain leaders</p>
                </div>
              </div>

              <div className="grid gap-4">
                {requests.length === 0 ? (
                  <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <p className="text-muted-foreground font-medium">No pending requests.</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <motion.div 
                      key={request.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500/5 flex items-center justify-center text-orange-400/40">
                          <User className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg">{request.leader_name} <span className="text-muted-foreground text-sm font-normal ml-2">requested {request.type} change</span></h4>
                          <div className="flex flex-wrap gap-4 mt-2">
                            {request.new_email && (
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">New Email</span>
                                <span className="text-sm font-bold text-primary">{request.new_email}</span>
                              </div>
                            )}
                            {request.new_password && (
                              <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">New Password</span>
                                <span className="text-sm font-bold text-primary">•••••••• (Hidden)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => handleRequestAction(request, 'rejected')} className="h-10 rounded-xl text-red-400 hover:bg-red-400/10 px-4 font-bold">Reject</Button>
                        <Button onClick={() => handleRequestAction(request, 'approved')} className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-6 font-bold shadow-lg shadow-emerald-600/20">Approve</Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "security" && (
          <motion.div 
            key="security" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-10"
          >
             <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-8">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-[2rem] bg-primary/20 flex items-center justify-center text-primary">
                        <User className="w-10 h-10" />
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold">{adminProfile?.name || session?.name}</h2>
                        <p className="text-primary font-black uppercase tracking-tighter text-sm">{session?.role?.replace('-', ' ')}</p>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Current Email</Label>
                        <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-lg">
                          <Mail className="w-5 h-5 mr-4 text-muted-foreground" /> {adminProfile?.email || "amcd@nrtec.in"}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground ml-1">Current Domain</Label>
                        <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-lg capitalize">
                          <Shield className="w-5 h-5 mr-4 text-muted-foreground" /> {adminProfile?.domain?.replace('-', ' ') || "Full Access"}
                        </div>
                      </div>
                    </div>

                    {session?.role === "domain-admin" && (
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Admin Modal (Super Admin only) */}
      <AnimatePresence>
        {isAddModalOpen && session?.role === "super-admin" && (
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

      {/* Leader Request Modal */}
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
