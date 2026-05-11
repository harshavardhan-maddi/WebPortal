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
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function StudentDashboard() {
  const { domain } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
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
        .or(`domain.eq.${domain},domain.eq.all`)
        .order('date', { ascending: false });


      if (qError) throw qError;

      const { data: results, error: rError } = await supabase
        .from('results')
        .select('quiz_id')
        .eq('roll_number', studentData.rollNumber);

      if (rError) throw rError;

      const completedIds = results?.map(r => r.quiz_id) || [];
      setCompletedQuizzes(completedIds);

      const todayStr = new Date().toISOString().split('T')[0];
      
      // Filter out quizzes that are past their closing time
      const processedQuizzes = (quizzes || []).filter((q: any) => {
        const quizEndDate = new Date(`${q.date}T${q.end_time || '23:59:59'}`);
        return quizEndDate > new Date(); // Only show if not expired
      }).map((q: any) => ({
        ...q,
        isToday: q.date === todayStr,
        duration: "30 Mins"
      }));

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
          </div>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" /> Today's Assessment
            </h2>
            <div className="grid gap-4">
              {allQuizzes.filter(q => q.isToday).map((quiz) => (
                <QuizCard 
                  key={quiz.id} 
                  quiz={quiz} 
                  currentTime={currentTime}
                  isCompleted={completedQuizzes.includes(quiz.id)}
                  onStart={() => handleStartQuiz(quiz.id)}
                />
              ))}
              {allQuizzes.filter(q => q.isToday).length === 0 && (
                <div className="glass p-10 rounded-[2rem] border border-white/5 text-center text-muted-foreground">
                  No assessments scheduled for today.
                </div>
              )}
            </div>
          </section>

          {allQuizzes.filter(q => !q.isToday).length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                <History className="w-5 h-5" /> Upcoming Assessments
              </h2>
              <div className="grid gap-4">
                {allQuizzes.filter(q => !q.isToday).map((quiz) => (
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
          )}
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz, isCompleted, onStart, currentTime }: { quiz: any, isCompleted: boolean, onStart: () => void, currentTime: Date }) {
  const quizStartTime = new Date(`${quiz.date}T${quiz.time}`);
  const isLocked = currentTime < quizStartTime;
  
  // Calculate countdown
  const diff = quizStartTime.getTime() - currentTime.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <motion.div
      whileHover={!isCompleted && !isLocked ? { y: -5 } : {}}
      className={`glass p-6 rounded-[2rem] border transition-all ${
        isCompleted ? 'border-white/5 opacity-80' : isLocked ? 'border-white/5' : 'border-white/10 hover:border-primary/40'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isCompleted ? 'bg-emerald-500/10 text-emerald-500' : isLocked ? 'bg-white/5 text-muted-foreground' : 'bg-primary/10 text-primary'
          }`}>
            {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : isLocked ? <Lock className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-xl font-bold">{quiz.title}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {quiz.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.time} - {quiz.end_time || '23:59'}</span>
              <span className="flex items-center gap-1">
                {Array.isArray(quiz.questions) ? quiz.questions.length : "Multi"} Questions
              </span>
            </div>
          </div>
        </div>

        <div>
          {isCompleted ? (
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold uppercase tracking-widest text-xs">
              <CheckCircle2 className="w-4 h-4" /> Completed
            </div>
          ) : isLocked ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 text-muted-foreground border border-white/10 font-bold text-xs">
                <Timer className="w-4 h-4" /> Starts in {hours > 0 ? `${hours}h ` : ""}{mins}m {secs}s
              </div>
            </div>
          ) : (
            <Button 
              onClick={onStart}
              className="rounded-full px-8 h-12 font-bold flex items-center gap-2 group"
            >
              Start Assessment <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
