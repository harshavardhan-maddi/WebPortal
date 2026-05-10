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

// Mock quizzes for demonstration
const mockQuizzes = [
  {
    id: "today-test",
    title: "Domain Assessment - Day 2",
    date: new Date().toLocaleDateString(),
    duration: "30 Mins",
    questions: 30,
    isToday: true,
  },
  {
    id: "yesterday-test",
    title: "Domain Assessment - Day 1",
    date: new Date(Date.now() - 86400000).toLocaleDateString(),
    duration: "30 Mins",
    questions: 30,
    isToday: false,
  }
];

export default function StudentDashboard() {
  const { domain } = useParams();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);

  useEffect(() => {
    const session = localStorage.getItem("student_session");
    if (!session) {
      router.push("/quiz/auth");
      return;
    }
    setStudent(JSON.parse(session));

    // Load completed status FOR THIS SPECIFIC STUDENT
    const studentData = JSON.parse(session);
    setStudent(studentData);
    
    const results = localStorage.getItem(`quiz_results_history_${studentData.rollNumber}`);
    if (results) {
      setCompletedQuizzes(JSON.parse(results));
    }

    // Load ALL quizzes from global storage and filter by current domain
    const globalQuizzes = JSON.parse(localStorage.getItem("global_quizzes") || "[]");
    
    // Add default mock quizzes if empty for demo
    const finalQuizzes = globalQuizzes.length > 0 ? globalQuizzes : [
      {
        id: "today-test",
        title: "Default Assessment",
        domain: domain,
        date: new Date().toISOString().split('T')[0],
        duration: "30 Mins",
        questions: 30,
        isToday: true,
      }
    ];

    // Filter to only show quizzes for THIS domain
    const filtered = finalQuizzes.filter((q: any) => q.domain === domain);
    
    // Dynamically set isToday based on the current date
    const today = new Date().toISOString().split('T')[0];
    const withTodayFlag = filtered.map((q: any) => ({
      ...q,
      isToday: q.date === today
    }));

    setAllQuizzes(withTodayFlag);
  }, [router, domain]);

  const handleStartQuiz = (quizId: string) => {
    if (completedQuizzes.includes(quizId)) return;
    router.push(`/quiz/${domain}/instructions?quizId=${quizId}`);
  };

  if (!student) return null;

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
                {Array.isArray(quiz.questions) ? quiz.questions.length : quiz.questions} Questions
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
