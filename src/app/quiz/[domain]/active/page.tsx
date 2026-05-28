"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  AlertTriangle,
  Camera,
  CameraOff,
  XCircle,
  Terminal,
  Play,
  CheckCircle,
  X,
  Code,
  Laptop,
  Check,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const CODE_TEMPLATES: Record<string, string> = {
  javascript: `// Write your JavaScript code here
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8');

function solve(input) {
    // Parse input and implement solution
    // e.g. Split by spaces
    const lines = input.trim().split(/\\s+/);
    if (lines.length >= 2) {
        console.log(Number(lines[0]) + Number(lines[1]));
    } else {
        console.log(lines[0]);
    }
}

solve(input);
`,
  python: `# Write your Python code here
import sys

def solve():
    input_data = sys.stdin.read()
    # Parse input and implement solution
    lines = input_data.strip().split()
    if len(lines) >= 2:
        print(int(lines[0]) + int(lines[1]))
    elif len(lines) == 1:
        print(lines[0])

if __name__ == '__main__':
    solve()
`,
  cpp: `// Write your C++ code here
#include <iostream>
#include <string>
using namespace std;

int main() {
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    } else {
        string s;
        if (cin >> s) {
            cout << s << endl;
        }
    }
    return 0;
}
`,
  c: `// Write your C code here
#include <stdio.h>
#include <stdlib.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    } else {
        char s[100];
        if (scanf("%s", s) == 1) {
            printf("%s\\n", s);
        }
    }
    return 0;
}
`,
  java: `// Write your Java code here
import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line != null) {
            String[] parts = line.trim().split("\\\\s+");
            if (parts.length >= 2) {
                System.out.println(Integer.parseInt(parts[0]) + Integer.parseInt(parts[1]));
            } else {
                System.out.println(parts[0]);
            }
        }
    }
}
`
};

export default function ActiveQuizPage() {
  const { domain } = useParams();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({}); // MCQ Answers
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isTabWarningVisible, setIsTabWarningVisible] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  
  // Coding Challenge States
  const [codeAnswers, setCodeAnswers] = useState<Record<number, { code: string; language: string }>>({});
  const [codeSubmissions, setCodeSubmissions] = useState<Record<number, number>>({});
  const [compileOutputs, setCompileOutputs] = useState<Record<number, { success: boolean; output: string; details?: string; warnings?: string }>>({});
  const [testResults, setTestResults] = useState<Record<number, { passed: number; total: number; details: any[] }>>({});
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitTesting, setIsSubmitTesting] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [activeCodingTab, setActiveCodingTab] = useState<"problem" | "console" | "testcases">("problem");
  
  // Camera Proctoring States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"loading" | "active" | "denied">("loading");
  
  // Anti-Screenshot / Circle to Search state
  const [isBlurred, setIsBlurred] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isCodingQuestion = currentQuestion?.type === "CODING";

  // Camera Access Logic
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: 640, height: 480 },
          audio: false 
        });
        setCameraStream(stream);
        setCameraStatus("active");
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        const params = new URLSearchParams(window.location.search);
        if (params.get('camera') === 'denied') {
          setCameraStatus("denied");
        } else {
          setCameraStatus("denied");
          setError("Camera access was not granted. Please enable your camera if you wish to be proctored.");
        }
      }
    }
    startCamera();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Load Quiz Data and Initialize Attempt
  useEffect(() => {
    const sessionStr = localStorage.getItem("student_session");
    if (!sessionStr) {
      router.push("/quiz/auth");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");
    if (!quizId) {
      setError("No assessment ID provided.");
      setIsLoading(false);
      return;
    }

    const session = JSON.parse(sessionStr);
    initializeAttempt(quizId, session);

    // Presence Tracking
    const channel = supabase.channel('online-students', {
      config: {
        presence: {
          key: session.rollNumber,
        },
      },
    });

    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            roll_number: session.rollNumber,
            name: session.name,
            domain: domain,
            batch: session.batch,
            status: 'writing',
            last_seen: new Date().toISOString()
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [router, domain]);

  const initializeAttempt = async (quizId: string, session: any) => {
    try {
      // 1. Check if student already has a result for this quiz
      const { data: existing } = await supabase
        .from('results')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('roll_number', session.rollNumber);

      const realResult = existing?.find(r => r.score !== -1 && r.score !== -2);
      const authorizedReattempt = existing?.find(r => r.score === -2);
      const specialAccess = existing?.find(r => r.score === -1);

      if (realResult) {
        setError("You have already attempted this exam. Multiple attempts are not allowed.");
        setIsLoading(false);
        return;
      }

      let currentReattemptCount = 0;
      let currentReattemptReason = "";

      if (authorizedReattempt) {
        currentReattemptCount = authorizedReattempt.reattempt_count || 0;
        currentReattemptReason = authorizedReattempt.reattempt_reason || "";
        await supabase.from('results').delete().eq('id', authorizedReattempt.id);
      } else if (specialAccess) {
        await supabase.from('results').delete().eq('id', specialAccess.id);
      }

      // 2. Fetch Quiz
      const { data: quizData, error: qError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (qError) throw qError;

      const quizEndTime = new Date(`${quizData.date}T${quizData.end_time || '23:59:59'}`);
      const isExpired = quizEndTime < new Date();

      if (isExpired && !authorizedReattempt && !specialAccess) {
        setError("This assessment has expired. You must request a re-attempt justification from your Dashboard to start.");
        setIsLoading(false);
        return;
      }

      // 3. Create an "Incomplete" entry immediately to lock the attempt
      let attemptRecord;
      const { data: newResult, error: rError } = await supabase
        .from('results')
        .insert([{
          quiz_id: quizId,
          domain: domain,
          batch: session.batch,
          roll_number: session.rollNumber,
          score: 0,
          correct: 0,
          incorrect: 0,
          total: quizData.questions.length,
          time_taken: 0,
          reattempt_count: currentReattemptCount,
          reattempt_reason: currentReattemptReason
        }])
        .select()
        .single();

      if (rError) {
        if (rError.message.includes("column") || rError.message.includes("schema cache") || rError.message.includes("cache")) {
          const { data: fbResult, error: fbError } = await supabase
            .from('results')
            .insert([{
              quiz_id: quizId,
              domain: domain,
              batch: session.batch,
              roll_number: session.rollNumber,
              score: 0,
              correct: 0,
              incorrect: 0,
              total: quizData.questions.length,
              time_taken: 0
            }])
            .select()
            .single();
          if (fbError) throw fbError;
          attemptRecord = fbResult;
        } else {
          throw rError;
        }
      } else {
        attemptRecord = newResult;
      }

      setAttemptId(attemptRecord.id);
      setQuestions(quizData.questions);
      
      // Initialize code boilerplates
      const initialCodeAnswers: Record<number, { code: string; language: string }> = {};
      quizData.questions.forEach((q: any, idx: number) => {
        if (q.type === "CODING") {
          const defaultLang = q.languages?.[0] || "javascript";
          initialCodeAnswers[idx] = {
            language: defaultLang,
            code: CODE_TEMPLATES[defaultLang] || ""
          };
        }
      });
      setCodeAnswers(initialCodeAnswers);
      setIsLoading(false);

    } catch (err: any) {
      console.error("Init Error:", err);
      setError(`Initialization failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Anti-cheat: Tab switch detection, Escape block and Blur detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(prev => prev + 1);
        setIsTabWarningVisible(true);
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    // Intercept Escape Key to disable exiting fullscreen/focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setWarnings(prev => prev + 1);
        setIsTabWarningVisible(true);
        setIsBlurred(true);
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router, domain]);

  // Timer
  useEffect(() => {
    if (questions.length === 0) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, questions]);

  const handleOptionSelect = (optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id || currentQuestionIndex]: [optionIndex]
    }));

    if (currentQuestionIndex < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
      }, 600);
    }
  };

  // Compile / Run Code logic (Run Code button)
  const handleRunCode = async () => {
    if (isCompiling || !currentQuestion) return;
    
    const studentCodeObj = codeAnswers[currentQuestionIndex];
    if (!studentCodeObj) return;

    setIsCompiling(true);
    setActiveCodingTab("console");
    setCompileOutputs(prev => ({
      ...prev,
      [currentQuestionIndex]: { success: true, output: "Compiling and running code..." }
    }));

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: studentCodeObj.code,
          language: studentCodeObj.language,
          input: customInput || currentQuestion.sampleInput || ""
        })
      });

      const res = await response.json();
      
      if (res.success) {
        setCompileOutputs(prev => ({
          ...prev,
          [currentQuestionIndex]: { 
            success: true, 
            output: res.output || "Code executed successfully with no stdout output.",
            warnings: res.warnings
          }
        }));
      } else {
        setCompileOutputs(prev => ({
          ...prev,
          [currentQuestionIndex]: { 
            success: false, 
            output: res.details || res.error || "Compilation/Runtime Error" 
          }
        }));
      }
    } catch (err: any) {
      setCompileOutputs(prev => ({
        ...prev,
        [currentQuestionIndex]: { 
          success: false, 
          output: `Network Error: ${err.message}` 
        }
      }));
    } finally {
      setIsCompiling(false);
    }
  };

  // Submit Code logic (runs all test cases, records score)
  const handleSubmitCode = async () => {
    if (isSubmitTesting || !currentQuestion) return;
    
    const studentCodeObj = codeAnswers[currentQuestionIndex];
    if (!studentCodeObj) return;

    setIsSubmitTesting(true);
    setActiveCodingTab("testcases");
    
    // Increment submission attempt count
    setCodeSubmissions(prev => ({
      ...prev,
      [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1
    }));

    const testCases = currentQuestion.testCases || [];
    if (testCases.length === 0) {
      setIsSubmitTesting(false);
      alert("No test cases defined for this challenge.");
      return;
    }

    const details: any[] = [];
    let passedCount = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const response = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: studentCodeObj.code,
            language: studentCodeObj.language,
            input: tc.input
          })
        });

        const res = await response.json();
        
        if (res.success) {
          const cleanOutput = (res.output || "").trim().replace(/\r\n/g, "\n");
          const cleanExpected = (tc.output || "").trim().replace(/\r\n/g, "\n");
          
          const isMatch = cleanOutput === cleanExpected;
          if (isMatch) passedCount++;

          details.push({
            index: i + 1,
            success: true,
            passed: isMatch,
            input: tc.input,
            output: cleanOutput,
            expected: cleanExpected
          });
        } else {
          details.push({
            index: i + 1,
            success: false,
            passed: false,
            input: tc.input,
            error: res.details || res.error || "Runtime Error"
          });
        }
      } catch (err: any) {
        details.push({
          index: i + 1,
          success: false,
          passed: false,
          input: tc.input,
          error: err.message
        });
      }
    }

    setTestResults(prev => ({
      ...prev,
      [currentQuestionIndex]: {
        passed: passedCount,
        total: testCases.length,
        details
      }
    }));

    setIsSubmitTesting(false);
  };

  // Submit assessment
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !attemptId) return;
    
    setIsSubmitting(true);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    // Check if it is a coding quiz
    const isCodingQuiz = questions.some(q => q.type === "CODING");
    let finalScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    const totalQuestions = questions.length;

    if (isCodingQuiz) {
      // For coding quizzes:
      // score: total passed test cases / total test cases percentage
      let totalTestCases = 0;
      let totalPassedTestCases = 0;

      questions.forEach((q, idx) => {
        if (q.type === "CODING") {
          const testCaseCount = q.testCases?.length || 0;
          const passedCount = testResults[idx]?.passed || 0;
          totalTestCases += testCaseCount;
          totalPassedTestCases += passedCount;
        }
      });

      finalScore = totalTestCases > 0 ? Math.round((totalPassedTestCases / totalTestCases) * 100) : 0;
      
      // correct count: stores total compiler submissions made
      let totalSubmissions = 0;
      Object.values(codeSubmissions).forEach(v => {
        totalSubmissions += v;
      });
      correctCount = totalSubmissions;

      // incorrect count: stores total tab switches (warnings)
      incorrectCount = warnings;
    } else {
      // MCQ Logic
      let correctAnswers = 0;
      questions.forEach((q: any, idx: number) => {
        const studentAnswer = answers[q.id || idx]?.[0];
        if (studentAnswer !== undefined && studentAnswer === q.correctAnswer) {
          correctAnswers++;
        }
      });

      correctCount = correctAnswers;
      incorrectCount = totalQuestions - correctAnswers;
      finalScore = Math.round((correctAnswers / totalQuestions) * 100);
    }

    const session = JSON.parse(localStorage.getItem("student_session") || "{}");
    const domainStr = cameraStatus === "active" ? `${domain}|cam-on` : `${domain}|cam-off`;

    try {
      // Update the results record
      const { error } = await supabase
        .from('results')
        .update({
          score: finalScore,
          correct: correctCount,
          incorrect: incorrectCount,
          total: totalQuestions,
          time_taken: 1800 - timeLeft,
          domain: domainStr // Pass camera proctoring suffix
        })
        .eq('id', attemptId);

      if (error) throw error;

      localStorage.setItem("quiz_result", JSON.stringify({
        score: finalScore,
        correct: correctCount,
        incorrect: incorrectCount,
        total: totalQuestions,
        rollNumber: session.rollNumber,
        tabSwitches: warnings,
        cameraDenied: cameraStatus === "denied"
      }));

      router.push(`/quiz/${domain}/results`);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}. Your progress was recorded as far as possible.`);
      router.push(`/quiz/${domain}/dashboard`);
    }
  }, [answers, domain, router, timeLeft, isSubmitting, questions, attemptId, testResults, codeSubmissions, warnings, cameraStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#05060f] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#05060f] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground mb-6">{error || "This quiz is no longer available."}</p>
        <Button onClick={() => router.push(`/quiz/${domain}/dashboard`)}>Back to Dashboard</Button>
      </div>
    );
  }

  // Current compiler status text
  const currentSubmissionCount = codeSubmissions[currentQuestionIndex] || 0;

  return (
    <div className="min-h-screen bg-[#02030a] text-white overflow-hidden flex flex-col select-none">
      {/* Header */}
      <header className="h-20 glass border-b border-white/5 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
            {currentQuestionIndex + 1}
          </div>
          <div>
            <h2 className="font-bold hidden sm:block">Question {currentQuestionIndex + 1} of {questions.length}</h2>
            <p className="text-xs text-muted-foreground capitalize">
              {isCodingQuestion ? "💻 Coding Challenge" : "⚡ Multiple Choice Question"}
            </p>
          </div>
        </div>

        {/* Live Proctoring Counts */}
        <div className="hidden lg:flex items-center gap-6 text-xs border-r border-white/5 pr-6 mr-6">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-muted-foreground">Compiler Runs:</span>
            <span className="font-bold">{currentSubmissionCount}</span>
          </div>
          <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>Tab Violations:</span>
            <span className="font-bold">{warnings}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full glass border ${timeLeft < 300 ? 'border-red-500/50 text-red-400' : 'border-white/10'}`}>
            <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
            <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleSubmit}>
            Submit Assessment
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <div className="px-6 py-3 border-b border-white/5 bg-[#05060f]">
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-1.5 bg-white/5" />
        </div>

        <div className="flex-1 overflow-hidden flex">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex overflow-hidden w-full"
            >
              {isCodingQuestion ? (
                // DUAL-PANEL CODING CHALLENGE INTERFACE
                <div className="flex-1 flex w-full overflow-hidden">
                  
                  {/* LEFT PANEL: Problem Details */}
                  <div className="w-[45%] border-r border-white/5 flex flex-col bg-[#05060f]/60">
                    <div className="h-12 border-b border-white/5 px-6 flex items-center gap-2 bg-white/5">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Problem Description</span>
                    </div>

                    <div className="flex-grow overflow-y-auto p-8 space-y-6 premium-scroll select-text">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black">{currentQuestion.text || "Coding Challenge"}</h3>
                      </div>

                      <div className="space-y-2 leading-relaxed text-slate-300 whitespace-pre-wrap">
                        {currentQuestion.problemStatement}
                      </div>

                      {currentQuestion.inputFormat && (
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Input Format</h4>
                          <p className="text-sm text-slate-300">{currentQuestion.inputFormat}</p>
                        </div>
                      )}

                      {currentQuestion.outputFormat && (
                        <div className="space-y-2 border-t border-white/5 pt-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Output Format</h4>
                          <p className="text-sm text-slate-300">{currentQuestion.outputFormat}</p>
                        </div>
                      )}

                      {(currentQuestion.sampleInput || currentQuestion.sampleOutput) && (
                        <div className="space-y-4 border-t border-white/5 pt-4">
                          <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Example Standard IO</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {currentQuestion.sampleInput && (
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Sample Input</span>
                                <pre className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-mono text-slate-200">{currentQuestion.sampleInput}</pre>
                              </div>
                            )}
                            {currentQuestion.sampleOutput && (
                              <div className="space-y-1">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Sample Output</span>
                                <pre className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-mono text-slate-200">{currentQuestion.sampleOutput}</pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT PANEL: Interactive Code Editor */}
                  <div className="w-[55%] flex flex-col bg-[#02030a] overflow-hidden">
                    
                    {/* Toolbar / Selector */}
                    <div className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#05060f]/60">
                      <div className="flex items-center gap-3">
                        <Code className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Editor</span>
                      </div>
                      
                      {/* Language Selection */}
                      <div className="flex gap-2">
                        {currentQuestion.languages?.map((lang: string) => {
                          const isSelected = codeAnswers[currentQuestionIndex]?.language === lang;
                          return (
                            <button
                              key={lang}
                              onClick={() => {
                                setCodeAnswers(prev => ({
                                  ...prev,
                                  [currentQuestionIndex]: {
                                    language: lang,
                                    code: CODE_TEMPLATES[lang] || ""
                                  }
                                }));
                              }}
                              className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${
                                isSelected 
                                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-md shadow-cyan-500/10' 
                                  : 'bg-white/5 border-white/5 text-muted-foreground hover:text-white'
                              }`}
                            >
                              {lang === "cpp" ? "C++" : lang}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Textarea Code IDE */}
                    <div className="flex-grow relative flex bg-[#020205] group overflow-hidden">
                      {/* Code numbering gutter */}
                      <div className="w-12 bg-black/20 border-r border-white/5 pt-4 text-right pr-3 font-mono text-xs text-slate-600 select-none">
                        {Array.from({ length: Math.max(10, (codeAnswers[currentQuestionIndex]?.code?.split('\n').length || 0)) }).map((_, idx) => (
                          <div key={idx} className="h-6 leading-6">{idx + 1}</div>
                        ))}
                      </div>

                      {/* Code Input */}
                      <textarea
                        value={codeAnswers[currentQuestionIndex]?.code || ""}
                        onChange={(e) => {
                          setCodeAnswers(prev => ({
                            ...prev,
                            [currentQuestionIndex]: {
                              ...prev[currentQuestionIndex],
                              code: e.target.value
                            }
                          }));
                        }}
                        className="flex-grow bg-transparent p-4 font-mono text-xs text-slate-100 focus:outline-none resize-none leading-6 overflow-y-auto selection:bg-cyan-500/20 premium-scroll"
                        style={{ whiteSpace: "pre", wordBreak: "keep-all" }}
                        spellCheck={false}
                      />
                    </div>

                    {/* Bottom Console / Test Results Panel */}
                    <div className="h-72 border-t border-white/5 flex flex-col bg-[#05060f]">
                      {/* Console Tabs */}
                      <div className="h-10 border-b border-white/5 px-4 flex items-center justify-between bg-black/20 text-xs">
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setActiveCodingTab("problem")} 
                            className={`px-3 h-10 font-bold uppercase tracking-wider border-b-2 transition-all ${
                              activeCodingTab === "problem" ? "border-purple-400 text-purple-400" : "border-transparent text-muted-foreground hover:text-white"
                            }`}
                          >
                            Custom Inputs
                          </button>
                          <button 
                            onClick={() => setActiveCodingTab("console")} 
                            className={`px-3 h-10 font-bold uppercase tracking-wider border-b-2 transition-all ${
                              activeCodingTab === "console" ? "border-cyan-400 text-cyan-400" : "border-transparent text-muted-foreground hover:text-white"
                            }`}
                          >
                            Console Output
                          </button>
                          <button 
                            onClick={() => setActiveCodingTab("testcases")} 
                            className={`px-3 h-10 font-bold uppercase tracking-wider border-b-2 transition-all ${
                              activeCodingTab === "testcases" ? "border-emerald-400 text-emerald-400" : "border-transparent text-muted-foreground hover:text-white"
                            }`}
                          >
                            Submit Results ({testResults[currentQuestionIndex]?.passed || 0}/{testResults[currentQuestionIndex]?.total || 0})
                          </button>
                        </div>

                        {/* Compiler Run Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            disabled={isCompiling || isSubmitTesting} 
                            onClick={handleRunCode}
                            className="h-8 rounded-lg font-bold border border-white/10 text-xs gap-1.5 px-3 hover:bg-white/5 text-cyan-400"
                          >
                            <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" /> Run Code
                          </Button>
                          <Button 
                            size="sm" 
                            disabled={isCompiling || isSubmitTesting} 
                            onClick={handleSubmitCode}
                            className="h-8 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-xs gap-1.5 px-4 shadow-lg shadow-emerald-500/10 text-white"
                          >
                            {isSubmitTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Submit Code
                          </Button>
                        </div>
                      </div>

                      {/* Console Body */}
                      <div className="flex-grow p-4 overflow-y-auto font-mono text-xs premium-scroll bg-[#030306]">
                        {activeCodingTab === "problem" && (
                          <div className="space-y-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Standard Input Stdin</span>
                            <textarea
                              value={customInput}
                              onChange={(e) => setCustomInput(e.target.value)}
                              placeholder={`Enter inputs to test with (Defaults to:\n${currentQuestion.sampleInput || ""})`}
                              className="w-full h-36 bg-black/40 border border-white/5 rounded-xl p-3 font-mono text-xs text-slate-300 focus:ring-1 ring-cyan-500 outline-none resize-none"
                            />
                          </div>
                        )}

                        {activeCodingTab === "console" && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Console Shell</span>
                              {compileOutputs[currentQuestionIndex]?.warnings && (
                                <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-sans font-bold">
                                  {compileOutputs[currentQuestionIndex]?.warnings}
                                </span>
                              )}
                            </div>
                            <pre className={`whitespace-pre-wrap leading-relaxed ${
                              compileOutputs[currentQuestionIndex]?.success === false ? "text-red-400" : "text-slate-300"
                            }`}>
                              {compileOutputs[currentQuestionIndex]?.output || "Ready. Write code and click 'Run Code' to execute against inputs."}
                            </pre>
                          </div>
                        )}

                        {activeCodingTab === "testcases" && (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-white/5">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">Test Case Evaluation Output</span>
                              <span className="font-bold text-xs">
                                Passed: {testResults[currentQuestionIndex]?.passed || 0} / {testResults[currentQuestionIndex]?.total || 0}
                              </span>
                            </div>

                            <div className="space-y-2">
                              {testResults[currentQuestionIndex]?.details?.map((res, rIdx) => (
                                <div key={rIdx} className={`p-3 rounded-xl border flex items-center justify-between ${
                                  res.passed 
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                                    : "bg-red-500/5 border-red-500/20 text-red-400"
                                }`}>
                                  <div className="flex items-center gap-3">
                                    {res.passed ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                                    <span className="font-bold">Test Case #{res.index}</span>
                                  </div>
                                  
                                  <div className="text-[10px] flex items-center gap-3">
                                    {res.success ? (
                                      res.passed ? (
                                        <span className="font-bold uppercase tracking-widest text-emerald-400">PASSED</span>
                                      ) : (
                                        <span className="font-bold uppercase tracking-widest text-red-400">FAILED (Mismatch)</span>
                                      )
                                    ) : (
                                      <span className="font-bold uppercase tracking-widest text-red-500">RUNTIME ERROR</span>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {!testResults[currentQuestionIndex] && (
                                <div className="text-center py-6 text-muted-foreground italic font-sans">
                                  No submission evaluated yet. Write solution and click 'Submit Code' to run cases.
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ) : (
                // STANDARD MCQ ASSESSMENT INTERFACE
                <div className="flex-grow flex items-center justify-center p-6 md:p-12 overflow-y-auto premium-scroll">
                  <div className="max-w-4xl w-full space-y-12 pb-24">
                    <h3 className="text-2xl md:text-3xl font-medium leading-tight">
                      {currentQuestion.text}
                    </h3>

                    <div className="grid gap-4">
                      {currentQuestion.options?.map((option: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => handleOptionSelect(idx)}
                          className={`group p-6 rounded-2xl border text-left transition-all flex items-center gap-6 ${
                            answers[currentQuestion.id || currentQuestionIndex]?.[0] === idx 
                              ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(58,123,213,0.15)]' 
                              : 'bg-[#05060f]/60 border-white/5 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold transition-colors ${
                            answers[currentQuestion.id || currentQuestionIndex]?.[0] === idx 
                              ? 'bg-primary border-primary text-white' 
                              : 'border-white/20 text-slate-500 group-hover:text-white'
                          }`}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="text-lg">{typeof option === 'string' ? option : option.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Proctoring Camera */}
      <motion.div 
        drag
        dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }}
        className="fixed bottom-32 right-8 z-40 w-48 h-36 bg-black rounded-2xl border-2 border-white/10 shadow-2xl overflow-hidden group cursor-move"
      >
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover scale-x-[-1]"
        />
        <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-red-500/80 rounded-full">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Live Feed</span>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera className="w-6 h-6 text-white/50" />
        </div>
      </motion.div>

      {/* Camera Denial Overlay */}
      {cameraStatus === "denied" && error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md">
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="glass p-4 rounded-2xl border border-orange-500/30 bg-orange-500/5 flex items-center gap-4 shadow-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
              <CameraOff className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-400">Camera Access Denied</p>
              <p className="text-[10px] text-muted-foreground">Proctoring is disabled. You may continue, but this will be recorded.</p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setError("")} className="h-8 w-8 p-0">
              <XCircle className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="h-24 glass border-t border-white/5 px-6 flex items-center justify-between z-20">
        <Button
          variant="ghost"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex(i => i - 1)}
          className="rounded-full px-6 text-white/60 hover:text-white"
        >
          <ChevronLeft className="mr-2 w-5 h-5" /> Previous
        </Button>

        <div className="flex gap-2 hidden md:flex">
          {questions.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === currentQuestionIndex 
                  ? 'bg-primary' 
                  : (questions[idx].type === "CODING" 
                      ? (testResults[idx]?.passed === testResults[idx]?.total && testResults[idx]?.total > 0 ? 'bg-emerald-500' : 'bg-white/10')
                      : (answers[questions[idx].id || idx] ? 'bg-emerald-500/50' : 'bg-white/10')
                    )
              }`}
            />
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button 
            onClick={handleSubmit} 
            className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white font-bold"
          >
            Finish assessment <Send className="ml-2 w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(i => i + 1)}
            className="rounded-full px-8 text-white font-bold"
          >
            Next Question <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        )}
      </footer>

      {/* Warnings Overlay */}
      <AnimatePresence>
        {isTabWarningVisible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full glass p-10 rounded-[2.5rem] border border-red-500/30 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-red-500 flex items-center justify-center gap-2">
                  ⚠️ AI Proctor Alert
                </h2>
                <p className="text-slate-300 mt-3 text-sm leading-relaxed">
                  Suspicious activity detected. <span className="text-white font-bold">Pressing Escape or switching tabs outside the assessment window is strictly forbidden.</span>
                </p>
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mt-4 text-sm font-bold flex items-center justify-between">
                  <span>Tab Violation Count:</span>
                  <span className="text-white font-black text-lg bg-red-600/30 px-3 py-1 rounded-xl">{warnings}</span>
                </div>
                {warnings >= 3 && <p className="text-red-400 mt-4 font-bold uppercase text-[10px] tracking-wider">Test continues, but activity has been reported to administrators.</p>}
              </div>
              <Button onClick={() => setIsTabWarningVisible(false)} className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold">
                I Understand & Return to Test
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="text-2xl font-bold">Submitting Assessment...</h2>
          <p className="text-muted-foreground">Calculating your performance metrics</p>
        </div>
      )}

      {/* Circle to Search / Blur Protection Overlay */}
      {isBlurred && (
        <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
          <h2 className="text-3xl font-black text-white">⚠️ Assessment Window De-focused</h2>
          <p className="text-muted-foreground mt-4 max-w-md leading-relaxed">
            Please return focus to the assessment window immediately to continue. Screen captures, external search tools, and other applications are blocked.
          </p>
        </div>
      )}
    </div>
  );
}
