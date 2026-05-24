"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  TrendingUp,
  Trophy,
  ShieldAlert
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

  // Re-attempt feature states
  const [isReattemptModalOpen, setIsReattemptModalOpen] = useState(false);
  const [selectedQuizForReattempt, setSelectedQuizForReattempt] = useState<any>(null);
  const [reattemptReason, setReattemptReason] = useState("");
  const [isSubmittingReattempt, setIsSubmittingReattempt] = useState(false);
  const [topThree, setTopThree] = useState<any[]>([]);
  const [showRankNotification, setShowRankNotification] = useState(false);
  const [notificationText, setNotificationText] = useState("");

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

    // Leaderboard Live Real-time Listener (dynamic shifts!)
    const resultsChannel = supabase.channel('results_realtime_student_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => {
        fetchData(studentData);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(resultsChannel);
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
        .filter(r => r.score !== -1 && r.score !== -2)
        .map(r => r.quiz_id);
      setCompletedQuizzes(completedIds);

      const todayStr = new Date().toISOString().split('T')[0];
      
      const processedQuizzes = (quizzes || []).map((q: any) => {
        const quizEndTime = new Date(`${q.date}T${q.end_time || '23:59:59'}`);
        const result = (results || []).find(r => r.quiz_id === q.id);
        const hasSpecialAccess = result && (result.score === -1 || result.score === -2);
        
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

      // Fetch leaderboard data for Top 3 Podium
      const { data: batchStudents } = await supabase
        .from('students')
        .select('roll_number, name, domain')
        .eq('batch', studentData.batch || '3rd Year Super 50');

      if (batchStudents && batchStudents.length > 0) {
        const studentRolls = batchStudents.map(s => s.roll_number);
        const { data: batchResults } = await supabase
          .from('results')
          .select('*')
          .in('roll_number', studentRolls)
          .neq('score', -1)
          .neq('score', -2);

        if (batchResults) {
          const studentCredits = batchStudents.map(s => {
            const sResults = batchResults.filter(r => r.roll_number === s.roll_number);
            const totalCredits = sResults.reduce((sum, r) => sum + (r.correct || 0), 0);
            return {
              roll_number: s.roll_number,
              name: s.name,
              totalCredits
            };
          });

          // Sort descending and get top 3
          const sortedRankings = studentCredits
            .sort((a, b) => b.totalCredits - a.totalCredits)
            .filter(r => r.totalCredits > 0)
            .slice(0, 3);

          setTopThree(prev => {
            // Check for ranking changes to trigger notification!
            if (prev.length > 0 && sortedRankings.length > 0) {
              const prevTopRoll = prev[0]?.roll_number;
              const newTopRoll = sortedRankings[0]?.roll_number;
              
              if (prevTopRoll !== newTopRoll) {
                // First place swapped!
                setNotificationText(`🏆 Leaderboard Shift! Roll Number ${newTopRoll} has taken the 1st position in the batch leaderboard!`);
                setShowRankNotification(true);
                setTimeout(() => setShowRankNotification(false), 8000);
              } else {
                // Check if the current student themselves climbed into the top 3
                const wasInTop = prev.some(r => r.roll_number === studentData.rollNumber);
                const isInTop = sortedRankings.some(r => r.roll_number === studentData.rollNumber);
                if (!wasInTop && isInTop) {
                  const myRank = sortedRankings.findIndex(r => r.roll_number === studentData.rollNumber) + 1;
                  setNotificationText(`🎉 Outstanding! You have secured Rank #${myRank} in the batch leaderboard!`);
                  setShowRankNotification(true);
                  setTimeout(() => setShowRankNotification(false), 8000);
                }
              }
            }
            return sortedRankings;
          });
        }
      }

    } catch (err) {
      console.error("Error fetching student dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReattemptModal = (quiz: any) => {
    setSelectedQuizForReattempt(quiz);
    setReattemptReason("");
    setIsReattemptModalOpen(true);
  };

  const handleConfirmReattempt = async () => {
    if (!reattemptReason.trim()) {
      alert("Please enter a valid reason.");
      return;
    }
    setIsSubmittingReattempt(true);
    try {
      const quizId = selectedQuizForReattempt.id;
      const today = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      
      const existingResult = allResults.find(r => r.quiz_id === quizId);
      
      if (existingResult) {
        const newCount = (existingResult.reattempt_count || 0) + 1;
        const formattedReason = `[Attempt ${newCount} - ${today}]: ${reattemptReason}`;
        const newReason = existingResult.reattempt_reason 
          ? `${existingResult.reattempt_reason}\n${formattedReason}` 
          : formattedReason;

        const { error } = await supabase
          .from('results')
          .update({
            score: -2,
            correct: 0,
            incorrect: 0,
            time_taken: 0,
            reattempt_count: newCount,
            reattempt_reason: newReason
          })
          .eq('id', existingResult.id);

        if (error) {
          if (error.message.includes("column") || error.message.includes("schema cache") || error.message.includes("cache")) {
            console.warn("Re-attempt columns not found in active database cache. Falling back to basic re-attempt authorization.");
            const { error: fallbackError } = await supabase
              .from('results')
              .update({
                score: -2,
                correct: 0,
                incorrect: 0,
                time_taken: 0
              })
              .eq('id', existingResult.id);
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      } else {
        const newReason = `[Attempt 1 - ${today}]: ${reattemptReason}`;
        const { error } = await supabase
          .from('results')
          .insert([{
            quiz_id: quizId,
            domain: domain,
            batch: student.batch,
            roll_number: student.rollNumber,
            score: -2,
            correct: 0,
            incorrect: 0,
            total: selectedQuizForReattempt.questions?.length || 0,
            time_taken: 0,
            reattempt_count: 1,
            reattempt_reason: newReason
          }]);

        if (error) {
          if (error.message.includes("column") || error.message.includes("schema cache") || error.message.includes("cache")) {
            console.warn("Re-attempt columns not found in active database cache. Falling back to basic re-attempt insertion.");
            const { error: fallbackError } = await supabase
              .from('results')
              .insert([{
                quiz_id: quizId,
                domain: domain,
                batch: student.batch,
                roll_number: student.rollNumber,
                score: -2,
                correct: 0,
                incorrect: 0,
                total: selectedQuizForReattempt.questions?.length || 0,
                time_taken: 0
              }]);
            if (fallbackError) throw fallbackError;
          } else {
            throw error;
          }
        }
      }

      setIsReattemptModalOpen(false);
      
      // Re-fetch data to update UI states in real time
      await fetchData(student);
      
      router.push(`/quiz/${domain}/instructions?quizId=${quizId}`);
    } catch (err: any) {
      console.error("Reattempt initiation failed:", err);
      alert(`Failed to authorize re-attempt: ${err.message}`);
    } finally {
      setIsSubmittingReattempt(false);
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
          {/* Live Batch Rankings Podium */}
          {topThree.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }} 
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[240px] glass border border-white/10 rounded-2xl p-4 shadow-2xl relative overflow-hidden flex flex-col gap-2 self-start"
            >
              {/* Notification Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Live Rankings</span>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider text-muted-foreground">{student.batch?.replace("Super 50", "S50")}</span>
              </div>

              {/* 3D-effect Podium Bar Graph */}
              <div className="flex items-end justify-center gap-2 pt-4 pb-1 h-24">
                {/* 2nd Place Bar (Left) */}
                {topThree[1] && (
                  <motion.div 
                    layout
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <span className="text-[7px] font-black text-slate-300 tracking-tight text-center truncate w-14" title={topThree[1].roll_number}>
                      {topThree[1].roll_number.slice(-4)}
                    </span>
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: 32 }} 
                      className="w-full bg-gradient-to-t from-slate-600/30 to-slate-400/50 border border-slate-400/40 rounded-t-lg flex flex-col justify-end items-center pb-1 shadow-[0_0_10px_rgba(148,163,184,0.05)]"
                    >
                      <span className="text-[8px] font-black text-slate-300">2nd</span>
                    </motion.div>
                    <span className="text-[7px] font-black text-slate-400">{topThree[1].totalCredits} Cr</span>
                  </motion.div>
                )}

                {/* 1st Place Bar (Middle) */}
                {topThree[0] && (
                  <motion.div 
                    layout
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <span className="text-[8px] font-black text-yellow-400 tracking-tight text-center truncate w-16" title={topThree[0].roll_number}>
                      🏆 {topThree[0].roll_number.slice(-4)}
                    </span>
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: 48 }} 
                      className="w-full bg-gradient-to-t from-yellow-600/30 to-yellow-400/60 border border-yellow-400/40 rounded-t-lg flex flex-col justify-end items-center pb-1 shadow-[0_0_15px_rgba(250,204,21,0.1)]"
                    >
                      <span className="text-[9px] font-black text-yellow-400">1st</span>
                    </motion.div>
                    <span className="text-[7px] font-black text-yellow-500">{topThree[0].totalCredits} Cr</span>
                  </motion.div>
                )}

                {/* 3rd Place Bar (Right) */}
                {topThree[2] && (
                  <motion.div 
                    layout
                    className="flex flex-col items-center gap-1 flex-1"
                  >
                    <span className="text-[7px] font-black text-amber-500 tracking-tight text-center truncate w-14" title={topThree[2].roll_number}>
                      {topThree[2].roll_number.slice(-4)}
                    </span>
                    <motion.div 
                      initial={{ height: 0 }} 
                      animate={{ height: 20 }} 
                      className="w-full bg-gradient-to-t from-amber-800/30 to-amber-600/50 border border-amber-600/40 rounded-t-lg flex flex-col justify-end items-center pb-1 shadow-[0_0_10px_rgba(217,119,6,0.05)]"
                    >
                      <span className="text-[8px] font-black text-amber-500">3rd</span>
                    </motion.div>
                    <span className="text-[7px] font-black text-amber-500/80">{topThree[2].totalCredits} Cr</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

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
                  onReattempt={() => handleOpenReattemptModal(quiz)}
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
                  onReattempt={() => handleOpenReattemptModal(quiz)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Re-attempt Justification Modal */}
      <AnimatePresence>
        {isReattemptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsReattemptModalOpen(false)}
                className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-white"
              >
                ✕
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400">
                  <PlayCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Request Assessment</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Quiz: {selectedQuizForReattempt?.title}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-widest ml-1">
                    Justification Reason
                  </label>
                  <textarea
                    value={reattemptReason}
                    onChange={(e) => setReattemptReason(e.target.value)}
                    placeholder="Provide a valid reason for attempting this assessment (e.g. sick, power outage, technical issues, low initial score)..."
                    className="w-full h-32 p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none text-sm placeholder:text-muted-foreground/50 text-white"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setIsReattemptModalOpen(false)}
                    variant="glass"
                    className="flex-1 h-14 rounded-2xl font-bold border-white/5 hover:bg-white/5"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmReattempt}
                    disabled={isSubmittingReattempt}
                    className="flex-1 h-14 rounded-2xl font-bold bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2"
                  >
                    {isSubmittingReattempt ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Confirm & Start"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Rank Shift Notification Overlay */}
      <AnimatePresence>
        {showRankNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: -20, scale: 0.9 }} 
            className="fixed top-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-red-500/20 border border-yellow-500/30 backdrop-blur-xl shadow-2xl flex items-center gap-4 text-white"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-yellow-400">Leaderboard Update</h4>
              <p className="text-xs font-medium text-white/90 mt-0.5 leading-relaxed">{notificationText}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuizCard({ quiz, isCompleted, onStart, onReattempt, currentTime }: { quiz: any, isCompleted: boolean, onStart: () => void, onReattempt?: () => void, currentTime: Date }) {
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
              {result.score === 0 && onReattempt && (
                <>
                  <div className="h-10 w-[1px] bg-white/10" />
                  <Button 
                    onClick={onReattempt}
                    className="rounded-full px-6 h-10 font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-600/20 text-white"
                  >
                    Re-attempt
                  </Button>
                </>
              )}
            </div>
          ) : isExpired ? (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-lg font-black text-muted-foreground italic">Not Attempted</p>
              </div>
              {onReattempt && (
                <Button 
                  onClick={onReattempt}
                  className="rounded-full px-6 h-10 font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/80 shadow-lg shadow-primary/20 text-white"
                >
                  Attempt Expired
                </Button>
              )}
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
              className="rounded-full px-8 h-12 font-black text-xs uppercase tracking-widest flex items-center gap-2 group bg-primary shadow-lg shadow-primary/20 text-white"
            >
              Start Now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
