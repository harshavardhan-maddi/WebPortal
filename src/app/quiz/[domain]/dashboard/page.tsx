"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Lock, 
  PlayCircle, 
  ArrowRight,
  History
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

  useEffect(() => {
    const session = localStorage.getItem("student_session");
    if (!session) {
      router.push("/quiz/auth");
      return;
    }
    const studentData = JSON.parse(session);
    setStudent(studentData);

    fetchData(studentData);
  }, [router, domain]);

  const fetchData = async (studentData: any) => {
    setIsLoading(true);
    try {
      // 1. Fetch ALL quizzes for THIS domain from Supabase
      const { data: quizzes, error: qError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('domain', domain)
        .order('date', { ascending: false });

      if (qError) throw qError;

      // 2. Fetch results for THIS student to mark completed tests
      const { data: results, error: rError } = await supabase
        .from('results')
        .select('quiz_id')
        .eq('roll_number', studentData.rollNumber);

      if (rError) throw rError;

      const completedIds = results?.map(r => r.quiz_id) || [];
      setCompletedQuizzes(completedIds);

      // 3. Process Quizzes with Today flag
      const today = new Date().toISOString().split('T')[0];
      const processedQuizzes = (quizzes || []).map((q: any) => ({
        ...q,
        isToday: q.date === today,
        duration: "30 Mins" // Default duration if not in DB
      }));

      setAllQuizzes(processedQuizzes);
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
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
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

        {/* Quiz Sections */}
        <div className="space-y-8">
          {/* Active / Today's Test */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" /> Today's Assessment
            </h2>
            <div className="grid gap-4">
              {allQuizzes.filter(q => q.isToday).map((quiz) => (
                <QuizCard 
                  key={quiz.id} 
                  quiz={quiz} 
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

          {/* Previous Tests */}
          {allQuizzes.filter(q => !q.isToday).length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2 text-muted-foreground">
                <History className="w-5 h-5" /> Previous Assessments
              </h2>
              <div className="grid gap-4">
                {allQuizzes.filter(q => !q.isToday).map((quiz) => (
                  <QuizCard 
                    key={quiz.id} 
                    quiz={quiz} 
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

function QuizCard({ quiz, isCompleted, onStart }: { quiz: any, isCompleted: boolean, onStart: () => void }) {
  return (
    <motion.div
      whileHover={!isCompleted ? { y: -5 } : {}}
      className={`glass p-6 rounded-[2rem] border transition-all ${
        isCompleted ? 'border-white/5 opacity-80' : 'border-white/10 hover:border-primary/40'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
          }`}>
            {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-xl font-bold">{quiz.title}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {quiz.date}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {quiz.duration}</span>
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
