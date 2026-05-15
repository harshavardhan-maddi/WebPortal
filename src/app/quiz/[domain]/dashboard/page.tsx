"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  ArrowRight,
  History,
  Timer,
  User,
  XCircle,
  BarChart3,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
  const { domain } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [allResults, setAllResults] = useState<any[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const session = localStorage.getItem("student_session");
    if (!session) {
      router.push("/quiz/auth");
      return;
    }
    const studentData = JSON.parse(session);
    setStudent(studentData);

    fetchData(studentData);

    // Presence Tracking
    const channel = supabase.channel('online-students', {
      config: {
        presence: {
          key: studentData.rollNumber,
        },
      },
    });

    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            roll_number: studentData.rollNumber,
            name: studentData.name,
            domain: domain,
            batch: studentData.batch,
            status: 'online',
            last_seen: new Date().toISOString()

          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [router, domain]);


  const fetchData = async (studentData: any) => {
    setIsLoading(true);
    try {
      const { data: quizzes, error: qError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('batch', studentData.batch || '3rd Year Super 50')
        .or(`domain.eq.${domain},domain.eq.all`)
        .order('date', { ascending: false });




      if (qError) throw qError;

      const { data: results, error: rError } = await supabase
        .from('results')
        .select('*')
        .eq('roll_number', studentData.rollNumber);

      if (rError) throw rError;

      setAllResults(results || []);
      const completedIds = (results || [])
        .filter(r => r.score !== -1)
        .map(r => r.quiz_id);
      setCompletedQuizzes(completedIds);

      const todayStr = new Date().toISOString().split('T')[0];
      
      const processedQuizzes = (quizzes || []).map((q: any) => {
        const quizEndTime = new Date(`${q.date}T${q.end_time || '23:59:59'}`);
        const result = (results || []).find(r => r.quiz_id === q.id);
        const hasSpecialAccess = result && result.score === -1;
        
        return {
          ...q,
          isToday: q.date === todayStr,
          hasSpecialAccess,
          isExpired: hasSpecialAccess ? false : quizEndTime < new Date(),
          result: hasSpecialAccess ? null : (result || null),
          duration: "30 Mins"
        };
      });

      setAllQuizzes(processedQuizzes);
      localStorage.setItem("global_quizzes", JSON.stringify(processedQuizzes));

    } catch (err) {
      console.error("Error fetching student dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (quizId: string) => {
    if (completedQuizzes.includes(quizId)) return;
    router.push(`/quiz/${domain}/instructions?quizId=${quizId}`);
  };

  if (!student || isLoading) {
    return (
      <div className="min-h-screen bg-[#05060f] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-bold">Welcome, <span className="cyber-text">{student.name}</span></h1>
            <p className="text-muted-foreground mt-2">Roll Number: {student.rollNumber} | Domain: <span className="capitalize">{domain?.toString().replace('-', ' ')}</span></p>
          </motion.div>
          <div className="flex gap-4">
            <div className="glass px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            </div>
            <Button 
              variant="glass" 
              onClick={() => router.push(`/quiz/${domain}/profile`)}
              className="rounded-xl border-white/5 gap-2 font-bold"
            >
              <User className="w-4 h-4 text-primary" />
              Profile
            </Button>
          </div>
        </div>

        <div className="space-y-12">
          {/* Active Assessments Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <PlayCircle className="w-6 h-6 text-primary" /> Active Assessments
                </h2>
                <div className="px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
                    Available Now
                </div>
            </div>
            <div className="grid gap-4">
              {allQuizzes.filter(q => !q.isExpired && !completedQuizzes.includes(q.id)).map((quiz) => (
                <QuizCard 
                  key={quiz.id} 
                  quiz={quiz} 
                  currentTime={currentTime}
                  isCompleted={false}
                  onStart={() => handleStartQuiz(quiz.id)}
                />
              ))}
              {allQuizzes.filter(q => !q.isExpired && !completedQuizzes.includes(q.id)).length === 0 && (
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 text-center text-muted-foreground font-medium italic">
                  No active assessments at the moment.
                </div>
              )}
            </div>
          </section>

          {/* Performance & History Section */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black flex items-center gap-3 text-emerald-400">
                  <TrendingUp className="w-6 h-6" /> Assessment History
                </h2>
                <div className="px-4 py-1 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                    Performance Track
                </div>
            </div>
            <div className="grid gap-4">
              {allQuizzes.filter(q => completedQuizzes.includes(q.id) || q.isExpired).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((quiz) => (
                <QuizCard 
                  key={quiz.id} 
                  quiz={quiz} 
                  currentTime={currentTime}
                  isCompleted={completedQuizzes.includes(quiz.id)}
                  onStart={() => handleStartQuiz(quiz.id)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz, isCompleted, onStart, currentTime }: { quiz: any, isCompleted: boolean, onStart: () => void, currentTime: Date }) {
  const quizStartTime = new Date(`${quiz.date}T${quiz.time}`);
  const quizEndTime = new Date(`${quiz.date}T${quiz.end_time || '23:59:59'}`);
  const isLocked = !quiz.hasSpecialAccess && currentTime < quizStartTime;
  const isExpired = !quiz.hasSpecialAccess && currentTime > quizEndTime;
  const result = quiz.result;
  
  // Calculate countdown
  const diff = quizStartTime.getTime() - currentTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <motion.div
      whileHover={!isCompleted && !isLocked && !isExpired ? { y: -5 } : {}}
      className={`glass p-6 rounded-[2.5rem] border transition-all ${
        isCompleted ? 'border-emerald-500/20 bg-emerald-500/5' : 
        isExpired ? 'border-red-500/10 bg-red-500/5 opacity-80' :
        isLocked ? 'border-white/5' : 'border-white/10 hover:border-primary/40'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 
            isExpired ? 'bg-red-500/10 text-red-400' :
            isLocked ? 'bg-white/5 text-muted-foreground' : 'bg-primary/10 text-primary'
          }`}>
            {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : 
             isExpired ? <XCircle className="w-8 h-8" /> :
             isLocked ? <Lock className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black tracking-tight">{quiz.title}</h3>
              {quiz.hasSpecialAccess && (
                <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/30">
                  Special Access
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-primary" /> {quiz.date}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-primary" /> {quiz.time} - {quiz.end_time || '23:59'}</span>
              <span className="flex items-center gap-1.5 text-primary">
                 {quiz.questions?.length || 0} Questions
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {isCompleted && result ? (
            <div className="flex items-center gap-8">
                <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Score Result</p>
                    <p className="text-2xl font-black text-emerald-400">
                        {result.correct}/{result.total}
                    </p>
                </div>
                <div className="h-10 w-[1px] bg-white/10" />
                <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Percentage</p>
                    <p className="text-2xl font-black text-primary">
                        {result.score}%
                    </p>
                </div>
            </div>
          ) : isExpired ? (
            <div className="text-right">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-lg font-black text-muted-foreground italic">Not Attempted</p>
            </div>
          ) : isLocked ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 text-muted-foreground border border-white/10 font-black text-[10px] uppercase tracking-widest">
                <Timer className="w-4 h-4" /> Starts in {hours > 0 ? `${hours}h ` : ""}{mins}m {secs}s
              </div>
            </div>
          ) : (
            <Button 
              onClick={onStart}
              className="rounded-full px-8 h-12 font-black text-xs uppercase tracking-widest flex items-center gap-2 group bg-primary shadow-lg shadow-primary/20"
            >
              Start Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
