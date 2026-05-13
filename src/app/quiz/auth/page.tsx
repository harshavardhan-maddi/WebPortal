"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Layout, 
  Brain, 
  Database, 
  Mail, 
  Lock,
  ChevronRight,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const domains = [
  { id: "cyber-security", title: "Cyber Security", icon: Shield },
  { id: "fsd", title: "Full Stack Development", icon: Layout },
  { id: "aiml", title: "AI & ML", icon: Brain },
  { id: "data-science", title: "Data Science", icon: Database },
];

const batches = [
  { id: "3rd Year Super 50", title: "3rd Year Super 50", description: "Cyber Security, FSD, AI/ML, Data Science" },
  { id: "4th Year Super 50", title: "4th Year Super 50", description: "Final Year Advanced Training" },
];


export default function StudentLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // Start at 0 for Batch selection
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    domain: "",
    batch: "3rd Year Super 50",
  });


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const selectBatch = (batchId: string) => {
    setFormData({ ...formData, batch: batchId });
    if (batchId === "4th Year Super 50") {
      setFormData(prev => ({ ...prev, domain: "general", batch: batchId }));
      setStep(2); // Skip domain selection for 4th years
    } else {
      setStep(1); // Proceed to domain selection for 3rd years
    }
    setError("");
  };

  const selectDomain = (domainId: string) => {
    setFormData({ ...formData, domain: domainId });
    setStep(2);
    setError("");
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const emailPart = formData.email.split('@')[0];
      const domainPart = formData.email.split('@')[1];

      // 1. Check Supabase for the student
      const { data: student, error: sbError } = await supabase
        .from('students')
        .select('*')
        .eq('roll_number', emailPart)
        .single();

      if (sbError && sbError.code !== 'PGRST116') { // PGRST116 is "not found"
         throw sbError;
      }

      if (student) {
        // Check for custom password, fallback to roll number
        const correctPassword = student.password || student.roll_number;
        if (formData.password !== correctPassword) {
          setError("Use correct credentials to attempt the test.");
          setIsLoading(false);
          return;
        }

        // Enforce batch-locking
        if (student.batch !== formData.batch) {
          setError(`You are registered in ${student.batch}. Please select the correct batch.`);
          setIsLoading(false);
          return;
        }

        // Enforce domain-locking
        if (student.domain !== formData.domain) {
          setError("You are not in this domain. Select your domain and attempt your test.");
          setIsLoading(false);
          return;
        }


        localStorage.setItem("student_session", JSON.stringify({
          id: student.id,
          email: `${student.roll_number}@nrtec.in`,
          domain: student.domain,
          batch: student.batch,
          rollNumber: student.roll_number,
          name: student.name,
          token: Math.random().toString(36).substring(7),
        }));
        router.push(`/quiz/${formData.domain}/dashboard`);

      } else {
        // 2. Fallback to hardcoded whitelist for Cyber Security (Original requirement)
        const cyberSecurityWhitelist = [
          "25475A4603", "24471A4652", "24471A4617", "24471A4624", "24471A4656",
          "24471A4608", "24471A4604", "24471A4610", "24471A4609", "24471A4611",
          "24471A4616", "24471A4644", "24471A4627", "24471A4658", "25475A4606",
          "25475A4605", "24471A4643", "24471A4647", "24471A4606", "24471A4654"
        ];

        if (formData.password === emailPart && domainPart === "nrtec.in") {
          if (formData.domain !== "cyber-security" && cyberSecurityWhitelist.includes(emailPart)) {
            setError("You are not in this domain. Select your domain and attempt your test.");
          } else if (formData.domain === "cyber-security" && !cyberSecurityWhitelist.includes(emailPart)) {
            setError("Use correct credentials to attempt the test.");
          } else {
            localStorage.setItem("student_session", JSON.stringify({
              email: formData.email,
              domain: formData.domain,
              batch: formData.batch, // Include batch in fallback session
              rollNumber: emailPart,
              name: emailPart,
              token: Math.random().toString(36).substring(7),
            }));
            router.push(`/quiz/${formData.domain}/dashboard`);

          }
        } else {
          setError("Use correct credentials to attempt the test.");
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError("Server connection failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyber-purple/10 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-xl">
        <div className="glass p-8 md:p-12 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="step0"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-3 text-white">Select <span className="text-primary">Batch</span></h1>
                  <p className="text-muted-foreground">Identify your academic program</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {batches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => selectBatch(b.id)}
                      className="group p-8 rounded-3xl glass-card border border-white/5 text-left transition-all hover:border-primary/40 hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-2xl mb-1 group-hover:text-primary transition-colors">{b.title}</h3>
                          <p className="text-sm text-muted-foreground">{b.description}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all">
                          <ChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <button 
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Batch
                </button>

                <div className="text-center">
                  <h1 className="text-4xl font-bold mb-3">Select <span className="text-primary">Domain</span></h1>
                  <p className="text-muted-foreground">Select your specialization</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {domains.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => selectDomain(d.id)}
                      className="group p-6 rounded-2xl glass-card border border-white/5 text-left transition-all hover:border-primary/40 hover:bg-white/10"
                    >
                      <div className="p-3 rounded-xl bg-white/5 group-hover:bg-primary/20 transition-colors w-fit mb-4">
                        <d.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-bold text-lg">{d.title}</h3>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <button 
                  onClick={() => formData.batch === "4th Year Super 50" ? setStep(0) : setStep(1)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white mb-10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </button>

                <div className="mb-10">
                  <h2 className="text-3xl font-bold mb-2">Verification</h2>
                  <div className="flex flex-col gap-1">
                    <p className="text-muted-foreground flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Batch: {formData.batch}
                    </p>
                    {formData.batch !== "4th Year Super 50" && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        Domain: {domains.find(d => d.id === formData.domain)?.title}
                      </p>
                    )}
                  </div>
                </div>


                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                    </motion.div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-muted-foreground ml-1">Student Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        name="email" 
                        type="email" 
                        placeholder="yourname@college.edu" 
                        required 
                        className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground ml-1">Access Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        name="password" 
                        type="password" 
                        placeholder="••••••••" 
                        required 
                        className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl focus:ring-primary"
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full h-14 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Authenticate <ChevronRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
