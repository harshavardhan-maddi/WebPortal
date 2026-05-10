"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, AlertCircle, CheckCircle2, Monitor } from "lucide-react";

export default function InstructionsPage() {
  const { domain } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem("student_session");
    if (!session) {
      router.push("/quiz/auth");
      return;
    } 
    setStudent(JSON.parse(session));

    // Get the specific quiz ID from URL
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");

    // Load quiz details to show in instructions
    const globalQuizzes = JSON.parse(localStorage.getItem("global_quizzes") || "[]");
    const found = globalQuizzes.find((q: any) => q.id === quizId);
    if (found) {
      setActiveQuiz(found);
    }
  }, [router]);

  const startQuiz = () => {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");
    router.push(`/quiz/${domain}/active?quizId=${quizId}`);
  };

  if (!student) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl w-full glass p-10 rounded-[2.5rem] border border-white/10"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-2xl bg-primary/20">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{activeQuiz?.title || "Quiz Instructions"}</h1>
            <p className="text-muted-foreground">Please read carefully before starting</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-cyber-blue mt-1" />
              <div>
                <p className="font-bold">Duration</p>
                <p className="text-sm text-muted-foreground">{activeQuiz?.duration || "30 Minutes"} total time</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-1" />
              <div>
                <p className="font-bold">Questions</p>
                <p className="text-sm text-muted-foreground">
                  {Array.isArray(activeQuiz?.questions) ? activeQuiz.questions.length : "30"} Multiple Choice Questions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-400 mt-1" />
              <div>
                <p className="font-bold">Auto-Submit</p>
                <p className="text-sm text-muted-foreground">Quiz will submit when timer ends</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-4">
            <h3 className="font-bold text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Anti-Cheat Policy
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-4">
              <li>Tab switching is strictly monitored.</li>
              <li>Fullscreen mode is mandatory.</li>
              <li>Right-click and Copy-Paste are disabled.</li>
              <li>3 warnings will lead to auto-disqualification.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest text-center">Your Details</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
              <span className="text-muted-foreground mr-2">Student:</span> {student.name}
            </span>
            <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
              <span className="text-muted-foreground mr-2">ID:</span> {student.rollNumber}
            </span>
            <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm capitalize">
              <span className="text-muted-foreground mr-2">Domain:</span> {domain?.toString().replace('-', ' ')}
            </span>
          </div>
        </div>

        <Button 
          onClick={startQuiz} 
          className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/20 group"
        >
          Enter Fullscreen & Start Quiz
          <Monitor className="ml-3 w-6 h-6 group-hover:scale-110 transition-transform" />
        </Button>
      </motion.div>
    </div>
  );
}
