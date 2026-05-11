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
  MonitorOff,
  Pause,
  Video,
  Camera,
  CameraOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function ActiveQuizPage() {
  const { domain } = useParams();
  const router = useRouter();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes
  const [isTabWarningVisible, setIsTabWarningVisible] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  
  // Camera Proctoring States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<"loading" | "active" | "denied">("loading");

  const currentQuestion = questions[currentQuestionIndex];

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
        setCameraStatus("denied");
        setError("Camera access is required for proctoring. Please enable your camera and refresh.");
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
        .select('id')
        .eq('quiz_id', quizId)
        .eq('roll_number', session.rollNumber)
        .single();

      if (existing) {
        setError("You have already attempted this exam. Multiple attempts are not allowed.");
        setIsLoading(false);
        return;
      }

      // 2. Fetch Quiz
      const { data: quizData, error: qError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (qError) throw qError;

      // 3. Create an "Incomplete" entry immediately to lock the attempt
      // If the student closes the browser now, they won't be able to re-enter.
      const { data: newResult, error: rError } = await supabase
        .from('results')
        .insert([{
          quiz_id: quizId,
          domain: domain,
          roll_number: session.rollNumber,
          score: 0,
          correct: 0,
          incorrect: 0,
          total: quizData.questions.length,
          time_taken: 0
        }])
        .select()
        .single();

      if (rError) throw rError;

      setAttemptId(newResult.id);
      setQuestions(quizData.questions);
      setIsLoading(false);

    } catch (err: any) {
      console.error("Init Error:", err);
      setError(`Initialization failed: ${err.message}`);
      setIsLoading(false);
    }
  };

  // Anti-cheat: Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            handleSubmit(); 
          }
          return next;
        });
        setIsTabWarningVisible(true);
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) {
        e.preventDefault();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
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

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !attemptId) return;
    
    setIsSubmitting(true);
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    let correctCount = 0;
    const totalQuestions = questions.length;
    
    questions.forEach((q: any, idx: number) => {
      const studentAnswer = answers[q.id || idx]?.[0];
      if (studentAnswer !== undefined && studentAnswer === q.correctAnswer) {
        correctCount++;
      }
    });

    const incorrectCount = totalQuestions - correctCount;
    const finalScore = Math.round((correctCount / totalQuestions) * 100);
    const session = JSON.parse(localStorage.getItem("student_session") || "{}");

    try {
      // Update the existing "Incomplete" result with the final scores
      const { error } = await supabase
        .from('results')
        .update({
          score: finalScore,
          correct: correctCount,
          incorrect: incorrectCount,
          total: totalQuestions,
          time_taken: 1800 - timeLeft
        })
        .eq('id', attemptId);

      if (error) throw error;

      localStorage.setItem("quiz_result", JSON.stringify({
        score: finalScore,
        correct: correctCount,
        incorrect: incorrectCount,
        total: totalQuestions,
        rollNumber: session.rollNumber
      }));

      router.push(`/quiz/${domain}/results`);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}. Your progress was recorded as far as possible.`);
      router.push(`/quiz/${domain}/dashboard`);
    }
  }, [answers, domain, router, timeLeft, isSubmitting, questions, attemptId]);

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

  return (
    <div className="min-h-screen bg-[#05060f] text-white overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-20 glass border-b border-white/5 px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
            {currentQuestionIndex + 1}
          </div>
          <div>
            <h2 className="font-bold hidden sm:block">Question {currentQuestionIndex + 1} of {questions.length}</h2>
            <p className="text-xs text-muted-foreground capitalize">{domain?.toString().replace('-', ' ')} Assessment</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-3 px-6 py-2.5 rounded-full glass border ${timeLeft < 300 ? 'border-red-500/50 text-red-400' : 'border-white/10'}`}>
            <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'animate-pulse' : ''}`} />
            <span className="font-mono text-xl font-bold">{formatTime(timeLeft)}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={handleSubmit} className="hidden sm:flex">
            Submit Quiz
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto premium-scroll p-6 md:p-12">
        <div className="max-w-4xl mx-auto space-y-12 pb-24">
          <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="h-2 bg-white/5" />

          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <h3 className="text-2xl md:text-3xl font-medium leading-tight">
                {currentQuestion.text}
              </h3>

              <div className="grid gap-4">
                {currentQuestion.options.map((option: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`group p-6 rounded-2xl border text-left transition-all flex items-center gap-6 ${
                      answers[currentQuestion.id || currentQuestionIndex]?.[0] === idx 
                        ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(58,123,213,0.15)]' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold transition-colors ${
                      answers[currentQuestion.id || currentQuestionIndex]?.[0] === idx 
                        ? 'bg-primary border-primary text-white' 
                        : 'border-white/20 text-muted-foreground'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-lg">{typeof option === 'string' ? option : option.text}</span>
                  </button>
                ))}
              </div>
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
      {cameraStatus === "denied" && (
        <div className="fixed inset-0 z-[100] bg-[#05060f] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2rem] flex items-center justify-center text-red-500 mb-8 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <CameraOff className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black mb-4">Camera Access Required</h2>
          <p className="text-muted-foreground max-w-md text-lg mb-8">
            This assessment is monitored for integrity. You must enable your camera to continue.
          </p>
          <Button onClick={() => window.location.reload()} size="lg" className="rounded-2xl px-12 h-14 text-lg font-bold">
            Enable Camera & Refresh
          </Button>
        </div>
      )}

      {/* Footer Navigation */}
      <footer className="h-24 glass border-t border-white/5 px-6 flex items-center justify-between z-20">
        <Button
          variant="ghost"
          disabled={currentQuestionIndex === 0}
          onClick={() => setCurrentQuestionIndex(i => i - 1)}
          className="rounded-full px-6"
        >
          <ChevronLeft className="mr-2 w-5 h-5" /> Previous
        </Button>

        <div className="flex gap-2 hidden md:flex">
          {questions.map((_, idx) => (
            <div 
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === currentQuestionIndex ? 'bg-primary' : answers[questions[idx].id || idx] ? 'bg-emerald-500/50' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button 
            onClick={handleSubmit} 
            className="rounded-full px-8 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
          >
            Finish Quiz <Send className="ml-2 w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex(i => i + 1)}
            className="rounded-full px-8"
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
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full glass p-10 rounded-[2.5rem] border border-red-500/30 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-red-500">AI Proctor Alert</h2>
                <p className="text-muted-foreground mt-2">
                  Suspicious activity detected. <span className="text-white font-bold">Do not use mobile devices, scan questions, or switch tabs.</span>
                </p>
                <p className="text-red-400 mt-4 text-sm">
                  Warning <span className="text-white font-bold">{warnings}</span> of 3.
                </p>
                {warnings >= 3 && <p className="text-red-400 mt-2 font-bold uppercase text-xs animate-pulse">Automatic Submission Triggered...</p>}
              </div>
              <Button onClick={() => setIsTabWarningVisible(false)} className="w-full">
                I Understand
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
    </div>
  );
}
