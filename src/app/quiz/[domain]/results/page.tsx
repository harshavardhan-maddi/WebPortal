"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Home,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";

export default function ResultsPage() {
  const { domain } = useParams();
  const router = useRouter();
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem("quiz_result");
    if (!data) {
      router.push("/");
    } else {
      setResult(JSON.parse(data));
    }
  }, [router]);

  if (!result) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Main Performance Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-12 rounded-[3rem] border border-white/10 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />
          
          <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(58,123,213,0.3)]">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
          
          <h1 className="text-4xl font-bold mb-3">Assessment Finalized</h1>
          <p className="text-muted-foreground">Results for Roll Number: <span className="text-white font-bold">{result.rollNumber}</span></p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-5xl font-black text-emerald-500">{result.correct}</p>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Correct</p>
            </div>

            <div className="p-8 rounded-[2rem] bg-red-500/5 border border-red-500/10 space-y-2">
              <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-5xl font-black text-red-500">{result.incorrect}</p>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Incorrect</p>
            </div>

            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-2">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-5xl font-black text-white">{formatTime(result.timeTaken || 0)}</p>
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-muted-foreground">Time Taken</p>
            </div>
          </div>

          <div className="mt-12 p-8 rounded-[2.5rem] bg-white/5 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <p className="text-sm font-bold text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Performance Summary
              </p>
              <h3 className="text-2xl font-bold mt-1">Final Score: {result.score}%</h3>
            </div>
            <div className="flex-1 max-w-xs space-y-4">
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${result.score}%` }}
                  className="h-full bg-primary"
                />
              </div>
              <div className="flex items-center justify-between px-2">
                <div className="text-left">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Tab Switches</p>
                  <p className={`text-sm font-bold ${result.tabSwitches > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {result.tabSwitches || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase">Camera Access</p>
                  <p className={`text-sm font-bold ${result.cameraDenied ? 'text-red-400' : 'text-emerald-400'}`}>
                    {result.cameraDenied ? 'Denied' : 'Granted'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Button */}
        <div className="flex justify-center">
          <Button 
            onClick={() => router.push(`/quiz/${domain}/dashboard`)}
            className="h-16 rounded-2xl px-12 text-xl font-bold shadow-xl shadow-primary/20 group"
          >
            <Home className="mr-3 w-6 h-6 group-hover:-translate-y-1 transition-transform" /> 
            Finish and Return to Dashboard
          </Button>
        </div>

      </div>
    </div>
  );
}
