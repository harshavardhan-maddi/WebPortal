"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, AlertCircle, CheckCircle2, Monitor } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function InstructionsPage() {
  const { domain } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [isPermissionLoading, setIsPermissionLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSpecialAccess, setHasSpecialAccess] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem("student_session");
    if (!session) {
      router.push("/quiz/auth");
      return;
    }
    const studentData = JSON.parse(session);
    setStudent(studentData);

    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");

    if (!quizId) {
      router.push(`/quiz/${domain}/dashboard`);
      return;
    }

    async function loadQuizData() {
      setIsLoading(true);
      try {
        // 1. Fetch Quiz from Supabase
        const { data: quiz, error: qError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("id", quizId)
          .single();

        if (qError) throw qError;
        setActiveQuiz(quiz);

        // 2. Fetch Result for this student
        const { data: results, error: rError } = await supabase
          .from("results")
          .select("*")
          .eq("quiz_id", quizId)
          .eq("roll_number", studentData.rollNumber);

        if (rError) throw rError;

        // Check for special access or reattempt approval
        const specialAccess = results?.find(r => r.score === -1 || r.score === -2);
        const hasAccess = !!specialAccess;
        setHasSpecialAccess(hasAccess);

        const quizEndTime = new Date(`${quiz.date}T${quiz.end_time || '23:59:59'}`);
        const expired = quizEndTime < new Date() && !hasAccess;
        setIsExpired(expired);

      } catch (err) {
        console.error("Error loading quiz data in instructions:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuizData();
  }, [router, domain]);

  const startQuiz = async () => {
    setIsPermissionLoading(true);
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: 640, height: 480 } 
      });
      
      // Stop the tracks immediately as we just wanted to check permission/initialize
      stream.getTracks().forEach(track => track.stop());
      
      const params = new URLSearchParams(window.location.search);
      const quizId = params.get("quizId");
      router.push(`/quiz/${domain}/active?quizId=${quizId}`);
    } catch (err) {
      console.error("Camera permission denied:", err);
      const confirmProceed = confirm("Camera access was denied. You can still proceed with the test, but you will not be monitored via video. Do you want to start the assessment anyway?");
      
      if (confirmProceed) {
        const params = new URLSearchParams(window.location.search);
        const quizId = params.get("quizId");
        router.push(`/quiz/${domain}/active?quizId=${quizId}&camera=denied`);
      }
    } finally {
      setIsPermissionLoading(false);
    }
  };

  if (!student || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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

        {isExpired ? (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-amber-500">Assessment Access Restricted</h3>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  This assessment has expired. Since you did not attempt this test during the scheduled window, you must submit a valid justification reason from your dashboard to request a re-attempt.
                </p>
              </div>
            </div>
            <Button 
              onClick={() => router.push(`/quiz/${domain}/dashboard`)}
              className="w-full h-16 rounded-2xl text-xl font-bold bg-amber-600 hover:bg-amber-500 shadow-xl shadow-amber-500/20 text-white"
            >
              Return to Dashboard
            </Button>
          </div>
        ) : (
          <Button 
            onClick={startQuiz} 
            disabled={isPermissionLoading}
            className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/20 group text-white"
          >
            {isPermissionLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Requesting Camera Access...
              </div>
            ) : (
              <>
                Enter Fullscreen & Start Quiz
                <Monitor className="ml-3 w-6 h-6 group-hover:scale-110 transition-transform" />
              </>
            )}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
