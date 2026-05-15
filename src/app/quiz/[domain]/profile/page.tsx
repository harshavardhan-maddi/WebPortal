"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function StudentProfile() {
  const { domain } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [requestStatus, setRequestStatus] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem("student_session");
    if (!session) {
      router.push("/quiz/auth");
      return;
    }
    const studentData = JSON.parse(session);
    setStudent(studentData);
    fetchRequestStatus(studentData.rollNumber);

    // Real-time listener for student record changes
    const channel = supabase
      .channel('student-request-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'students',
          filter: `roll_number=eq.${studentData.rollNumber}`
        },
        (payload) => {
          setRequestStatus({
            status: payload.new.password_request_status,
            requested_password: payload.new.requested_password
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const fetchRequestStatus = async (rollNumber: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('password_request_status, requested_password')
      .eq('roll_number', rollNumber)
      .single();

    if (data) {
      setRequestStatus({
        status: data.password_request_status,
        requested_password: data.requested_password
      });
    }
  };

  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 4) {
      setMessage({ type: "error", text: "Password must be at least 4 characters." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase
      .from('students')
      .update({
        requested_password: newPassword,
        password_request_status: 'PENDING'
      })
      .eq('roll_number', student.rollNumber);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Request sent successfully! Waiting for leader approval." });
      setNewPassword("");
      setConfirmPassword("");
      fetchRequestStatus(student.rollNumber);
    }
    setIsSubmitting(false);
  };

  if (!student) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 bg-[#02030a]">
      <div className="max-w-2xl mx-auto space-y-10">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tighter">Student <span className="text-primary">Profile</span></h1>
          <p className="text-muted-foreground mt-2">Manage your account and password requests</p>
        </div>

        <div className="grid gap-8">
          <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black">{student.name}</h3>
                <p className="text-muted-foreground font-bold">{student.rollNumber} | {student.batch}</p>
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-[2.5rem] border border-white/10 space-y-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Lock className="w-24 h-24" />
            </div>
            
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black">Request Password Change</h2>
            </div>

            <form onSubmit={handleRequestChange} className="space-y-6 relative z-10">
              {message && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} text-xs font-bold flex items-center gap-3`}
                >
                  {message.type === 'success' ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {message.text}
                </motion.div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">New Password</Label>
                <Input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Confirm New Password</Label>
                <Input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" 
                  required 
                  className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary text-lg"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting || (requestStatus?.status === 'PENDING')}
                className="w-full h-14 rounded-2xl text-lg font-black bg-primary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                {isSubmitting ? "Sending Request..." : "Submit Request"}
              </Button>
            </form>
          </div>

          {requestStatus && requestStatus.status !== 'NONE' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass p-8 rounded-[2.5rem] border ${
                requestStatus.status === 'ACCEPTED' ? 'border-emerald-500/20 bg-emerald-500/5' : 
                requestStatus.status === 'REJECTED' ? 'border-red-500/20 bg-red-500/5' : 
                'border-orange-500/20 bg-orange-500/5'
              } space-y-4`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-black flex items-center gap-2 text-lg">
                  {requestStatus.status === 'ACCEPTED' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : 
                   requestStatus.status === 'REJECTED' ? <XCircle className="w-6 h-6 text-red-400" /> : 
                   <Clock className="w-6 h-6 text-orange-400" />}
                  Request Status
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${
                  requestStatus.status === 'ACCEPTED' ? 'bg-emerald-400 text-black' : 
                  requestStatus.status === 'REJECTED' ? 'bg-red-500 text-white' : 
                  'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}>
                  {requestStatus.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                {requestStatus.status === 'ACCEPTED' ? 
                  "Your request has been approved! You can now use your new password." : 
                 requestStatus.status === 'REJECTED' ? 
                  "Your request was rejected. Please contact your coordinator." : 
                  "Your request is pending leader approval."}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
