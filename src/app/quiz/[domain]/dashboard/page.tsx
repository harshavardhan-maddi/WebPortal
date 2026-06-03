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
  ShieldAlert,
  Flame,
  Zap,
  Download,
  Award,
  FileText,
  TrendingDown,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { 
  downloadSingleReportCard, 
  downloadConsolidatedReport 
} from "@/lib/pdfGenerator";
import { 
  getQuestionTopic, 
  generateDeterministicStudentAnswers,
  calculateRankProgression
} from "@/lib/reportUtils";

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
  const [activeTab, setActiveTab] = useState<"assessments" | "reports">("assessments");
  const [allStudentRankings, setAllStudentRankings] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myCredits, setMyCredits] = useState<number>(0);
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);
  const [batchStudents, setBatchStudents] = useState<any[]>([]);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [selectedResultDetail, setSelectedResultDetail] = useState<any>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
        .select('*, quizzes(*)')
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
      const { data: batchStudentsData } = await supabase
        .from('students')
        .select('roll_number, name, domain')
        .eq('batch', studentData.batch || '3rd Year Super 50');

      if (batchStudentsData && batchStudentsData.length > 0) {
        setBatchStudents(batchStudentsData);
        const studentRolls = batchStudentsData.map(s => s.roll_number);
        const { data: batchResultsData } = await supabase
          .from('results')
          .select('*')
          .in('roll_number', studentRolls)
          .neq('score', -1)
          .neq('score', -2);

         if (batchResultsData) {
          setBatchResults(batchResultsData);
          const studentCredits = batchStudentsData.map(s => {
            const sResults = batchResultsData.filter(r => r.roll_number === s.roll_number);
            const totalCredits = sResults.reduce((sum, r) => sum + (r.correct || 0), 0);
            return {
              roll_number: s.roll_number,
              name: s.name,
              domain: s.domain,
              totalCredits
            };
          });

          // Sort descending for full ranking and save to state
          const fullRankings = [...studentCredits].sort((a, b) => b.totalCredits - a.totalCredits);
          setAllStudentRankings(fullRankings);

          const myIndex = fullRankings.findIndex(r => r.roll_number === studentData.rollNumber);
          if (myIndex !== -1) {
            setMyRank(myIndex + 1);
            setMyCredits(fullRankings[myIndex].totalCredits);
          } else {
            setMyRank(null);
            setMyCredits(0);
          }

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

  // 1. Streak calculation
  const computedStreak = (() => {
    if (!allResults || allResults.length === 0) return 0;
    const attemptDates = Array.from(new Set(
      allResults
        .filter(r => r.timestamp && r.score !== -1 && r.score !== -2)
        .map(r => r.timestamp.split('T')[0])
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (attemptDates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    const lastAttemptDate = attemptDates[0];
    if (lastAttemptDate !== today && lastAttemptDate !== yesterday) {
      return 0;
    }

    let currentDate = new Date(lastAttemptDate);
    for (let i = 0; i < attemptDates.length; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (attemptDates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  })();

  // 2. Tests attempted count
  const testsAttemptedCount = allResults.filter(r => r.score !== -1 && r.score !== -2).length;

  // 3. Speedometer values
  const speedometerScore = myCredits;
  const speedometerMax = 10000;
  const speedometerPercent = Math.min(speedometerScore / speedometerMax, 1);
  const needleRotation = (speedometerPercent * 180) - 90;
  const speedometerColor = (() => {
    if (speedometerScore <= 2500) return "#ffffff";
    if (speedometerScore <= 5000) return "#ef4444";
    if (speedometerScore <= 7500) return "#f97316";
    return "#10b981";
  })();

  // 4. Leaderboard selections
  const overallTopThree = allStudentRankings.filter(r => r.totalCredits > 0).slice(0, 3);
  const isThirdYear = student.batch?.toLowerCase().includes("3rd");
  const filteredRankings = allStudentRankings.filter(r => !isThirdYear || r.domain === domain);
  const topTenRankings = filteredRankings.slice(0, 10);

  // 5. SVG Chart data points (computed directly from processed quizzes)
  const getChartDataPoints = () => {
    let runningTotal = 0;
    return allQuizzes
      .filter((q: any) => q.result && q.result.score !== -1 && q.result.score !== -2)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((q: any) => {
        const credits = q.result.correct || 0;
        runningTotal += credits;
        const dateStr = new Date(q.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          credits,
          cumulativeCredits: runningTotal,
          date: dateStr,
          title: q.title
        };
      });
  };

  const chartDataPoints = getChartDataPoints();
  const maxChartCredits = Math.max(...chartDataPoints.map(p => p.cumulativeCredits), 10);

  // 6. Total Portal Time Spent
  const totalPortalTimeSpent = allResults.reduce((sum, r) => sum + (r.time_taken || 0), 0);
  const formatPortalTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-bold">Welcome, <span className="cyber-text">{student.name}</span></h1>
            <p className="text-muted-foreground mt-2">Roll Number: {student.rollNumber} | Domain: <span className="capitalize">{domain?.toString().replace('-', ' ')}</span></p>
          </motion.div>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 flex items-center shadow-xl">
              <button
                onClick={() => setActiveTab("assessments")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "assessments" ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'
                }`}
              >
                Assessments
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "reports" ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'
                }`}
              >
                Reports
              </button>
            </div>
            <div className="glass px-4 py-2.5 rounded-xl border border-white/5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
            </div>
            <Button 
              variant="glass" 
              onClick={() => router.push(`/quiz/${domain}/profile`)}
              className="rounded-xl border-white/5 gap-2 font-bold h-[42px]"
            >
              <User className="w-4 h-4 text-primary" />
              Profile
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "assessments" ? (
            <motion.div
              key="assessments"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-12"
            >              {/* Portal Stats Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="glass p-6 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Time Spent in Portal</h3>
                    <p className="text-3xl font-black text-white mt-2">
                      {formatPortalTime(totalPortalTimeSpent)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                <div className="glass p-6 rounded-[2rem] border border-white/10 flex items-center justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Assessments Completed</h3>
                    <p className="text-3xl font-black text-white mt-2">
                      {completedQuizzes.length} Completed
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>
              </div>

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
            </motion.div>
          ) : (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              {/* Consolidated Report Banner */}
              <div className="glass p-8 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                      <Award className="w-3.5 h-3.5" /> Consolidated Analytics
                    </div>
                    <h3 className="text-2xl font-black text-white">Consolidated Performance Report</h3>
                    <p className="text-sm text-muted-foreground max-w-xl">
                      Download a comprehensive PDF summarizing all your test scores, batch rank progression, subject accuracy metrics, and personalized learning recommendations.
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (isGeneratingPdf) return;
                      setIsGeneratingPdf(true);
                      try {
                        const formattedStudent = {
                          ...student,
                          id: student.id || student.rollNumber,
                          name: student.name,
                          rollNumber: student.rollNumber,
                          batch: student.batch || '3rd Year Super 50',
                          domain: domain || student.domain || 'all'
                        };
                        
                        downloadConsolidatedReport(
                          formattedStudent,
                          allResults,
                          allQuizzes,
                          batchStudents,
                          batchResults
                        );
                      } catch (err) {
                        console.error("Failed to generate consolidated report:", err);
                        alert("Error generating PDF report. Please try again.");
                      } finally {
                        setIsGeneratingPdf(false);
                      }
                    }}
                    disabled={isGeneratingPdf || allResults.filter(r => r.score !== -1 && r.score !== -2).length === 0}
                    className="h-14 px-8 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary hover:bg-primary/95 text-white flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0 disabled:opacity-50"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" /> Download Consolidated PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Reports Dashboard Top Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                {/* Left Card: Streak & Assessments Attempted */}
                <div className="glass p-6 rounded-[2rem] border border-white/10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-lg font-black text-white/90 tracking-wide mb-1 uppercase text-xs">Performance Streak</h3>
                    <p className="text-xs text-muted-foreground">Keep completing quizzes daily to keep the fire burning!</p>
                  </div>

                  <div className="flex items-center gap-6 py-6">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 relative">
                      <Flame className="w-9 h-9" />
                      {computedStreak > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-4xl font-black text-white">{computedStreak} Days</div>
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Current Active Streak</div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Tests Attempted</span>
                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      {testsAttemptedCount} Assessments
                    </span>
                  </div>
                </div>

                {/* Right Card: Speedometer Gauge */}
                <div className="glass p-6 rounded-[2rem] border border-white/10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div>
                    <h3 className="text-lg font-black text-white/90 tracking-wide mb-1 uppercase text-xs">Credits</h3>
                    <p className="text-xs text-muted-foreground">Real-time accumulated credits speedometer</p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-2 relative">
                    {/* SVG Gauge */}
                    <svg className="w-48 h-28" viewBox="0 0 200 110">
                      {/* Background arc */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />
                      {/* Foreground arc using dynamic color based on credits range */}
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke={speedometerColor}
                        strokeWidth="14"
                        strokeLinecap="round"
                        strokeDasharray="251"
                        strokeDashoffset={251 - (251 * speedometerPercent)}
                        className="transition-all duration-1000 ease-out"
                      />
                      {/* Speedometer Needle */}
                      <g transform="translate(100, 100)">
                        <line
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="-75"
                          stroke={speedometerColor}
                          strokeWidth="3"
                          strokeLinecap="round"
                          style={{
                            transform: `rotate(${needleRotation}deg)`,
                            transformOrigin: "center bottom",
                            transition: "transform 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                          }}
                        />
                        <circle cx="0" cy="0" r="6" fill="#ffffff" />
                        <circle cx="0" cy="0" r="3" fill={speedometerColor} />
                      </g>
                    </svg>

                    <div className="absolute bottom-1 flex flex-col items-center">
                      <span className="text-xl font-black text-white">{speedometerScore.toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">/ {speedometerMax.toLocaleString()} Credits</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Credits</span>
                    <span className="text-xs font-black bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20" style={{ color: speedometerColor, borderColor: `${speedometerColor}33` }}>
                      {myCredits} Credits
                    </span>
                  </div>
                </div>
              </div>

              {/* Reports Dashboard Bottom Grid (Rankings vs SVG Chart) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-left">
                {/* Left Panel: Rankings & Top 10 lists (2 cols width) */}
                <div className="lg:col-span-2 space-y-6 flex flex-col">
                  {/* Top 3 & My Rank card */}
                  <div className="glass p-6 rounded-[2rem] border border-white/10 shadow-2xl flex-grow flex flex-col gap-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                      <Trophy className="w-4 h-4 text-yellow-500" /> Batch Podium (Top 3)
                    </h3>
                    
                    <div className="space-y-2">
                      {overallTopThree.map((item, index) => (
                        <div key={item.roll_number} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              index === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                              'bg-amber-600/20 text-amber-500 border border-amber-600/30'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="text-xs font-black text-white">{item.roll_number}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">({item.name})</span>
                          </div>
                          <span className="text-xs font-black text-muted-foreground">{item.totalCredits} Cr</span>
                        </div>
                      ))}
                      {overallTopThree.length === 0 && (
                        <p className="text-xs italic text-muted-foreground text-center py-2">No rankings available yet.</p>
                      )}
                    </div>

                    {/* Personal Placement Details Card */}
                    <div className="mt-auto p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-black text-primary uppercase tracking-widest">Your Position</div>
                        <div className="text-sm font-black text-white mt-0.5">#{myRank || "-"} In Batch</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] font-black text-primary uppercase tracking-widest">Your Score</div>
                        <div className="text-sm font-black text-white mt-0.5">{myCredits} Credits</div>
                      </div>
                    </div>
                  </div>

                  {/* Top 10 List Card */}
                  <div className="glass p-6 rounded-[2rem] border border-white/10 shadow-2xl flex-grow flex flex-col gap-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-3">
                      <Zap className="w-4 h-4 text-primary" /> {isThirdYear ? `${domain?.toString().replace('-', ' ').toUpperCase()} Top 10` : 'Overall Top 10'}
                    </h3>

                    <div className="space-y-1.5 overflow-y-auto max-h-[280px] pr-1">
                      {topTenRankings.map((item, idx) => {
                        const isMe = item.roll_number === student.rollNumber;
                        return (
                          <div 
                            key={item.roll_number} 
                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                              isMe ? 'bg-primary/20 border border-primary/30 shadow-lg' : 'bg-white/5 border border-white/5 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                                isMe ? 'bg-primary text-white' : 'bg-white/10 text-muted-foreground'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className={`text-xs font-black ${isMe ? 'text-white' : 'text-white/80'}`}>{item.roll_number}</span>
                              <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">({item.name})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-white/90">{item.totalCredits} Cr</span>
                              {isMe && <span className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded font-black uppercase">You</span>}
                            </div>
                          </div>
                        );
                      })}
                      {topTenRankings.length === 0 && (
                        <p className="text-xs italic text-muted-foreground text-center py-4">No rankings available yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel: SVG Performance Line Chart (3 cols width) */}
                <div className="lg:col-span-3 glass p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-400" /> Assessment Analytics
                      </h3>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                        Chronological Trend
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Interactive credits graph mapping your progress over scheduled exams.</p>
                  </div>

                  <div className="py-6 flex items-center justify-center min-h-[220px]">
                    {chartDataPoints.length > 0 ? (
                      <div className="w-full relative">
                        {/* Interactive Tooltip Card overlay inside graph container */}
                        {hoveredPoint && (
                          <div 
                            className="absolute bg-[#0b0c16]/95 border border-white/10 rounded-xl p-3 shadow-2xl z-50 text-xs font-black space-y-1 transition-all duration-200 pointer-events-none"
                            style={{
                              left: `${Math.min(Math.max(hoveredPoint.x - 60, 10), 320)}px`,
                              top: `${Math.max(hoveredPoint.y - 75, 5)}px`
                            }}
                          >
                            <p className="text-[9px] text-primary uppercase tracking-wider">{hoveredPoint.date}</p>
                            <p className="text-white truncate max-w-[130px] font-black">{hoveredPoint.title}</p>
                            <p className="text-emerald-400 text-[10px] font-black mt-0.5">Test Credits: {hoveredPoint.credits} Cr</p>
                            <p className="text-amber-400 text-[10px] font-black">Total Credits: {hoveredPoint.cumulativeCredits} Cr</p>
                          </div>
                        )}

                        <svg className="w-full h-auto" viewBox="0 0 500 250">
                          <defs>
                            {/* Area Gradient */}
                            <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                            {/* Line Gradient */}
                            <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#6366f1" />
                              <stop offset="50%" stopColor="#10b981" />
                              <stop offset="100%" stopColor="#06b6d4" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="50" y1="50" x2="460" y2="50" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                          <line x1="50" y1="125" x2="460" y2="125" stroke="rgba(255,255,255,0.05)" strokeDasharray="3" />
                          <line x1="50" y1="200" x2="460" y2="200" stroke="rgba(255,255,255,0.08)" />

                          {/* Graph Axes Labels */}
                          <text x="45" y="55" fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="bold" textAnchor="end">{maxChartCredits} Cr</text>
                          <text x="45" y="130" fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="bold" textAnchor="end">{Math.round(maxChartCredits / 2)} Cr</text>
                          <text x="45" y="205" fill="rgba(255,255,255,0.4)" fontSize="8" fontWeight="bold" textAnchor="end">0 Cr</text>

                          {/* Plot lines */}
                          {(() => {
                            let pathD = "";
                            let fillD = "";
                            const points = chartDataPoints.map((item, idx) => {
                              const x = chartDataPoints.length > 1 ? (idx / (chartDataPoints.length - 1)) * 410 + 50 : 250;
                              const y = 200 - (item.cumulativeCredits / maxChartCredits) * 150;
                              return { x, y, ...item };
                            });

                            if (points.length > 1) {
                              pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
                              fillD = `${pathD} L ${points[points.length - 1].x} 200 L ${points[0].x} 200 Z`;
                            }

                            return (
                              <>
                                {points.length > 1 && (
                                  <>
                                    {/* Filled area */}
                                    <path d={fillD} fill="url(#area-grad)" />
                                    {/* Outline line */}
                                    <path d={pathD} fill="none" stroke="url(#line-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </>
                                )}

                                {/* Interactive hover points */}
                                {points.map((pt, idx) => (
                                  <g 
                                    key={idx}
                                    onMouseEnter={() => setHoveredPoint(pt)}
                                    onMouseLeave={() => setHoveredPoint(null)}
                                    className="cursor-pointer group"
                                  >
                                    {/* Glow Ring */}
                                    <circle 
                                      cx={pt.x} 
                                      cy={pt.y} 
                                      r="10" 
                                      fill="transparent" 
                                      className="group-hover:fill-primary/20 transition-all duration-200" 
                                    />
                                    {/* Small Point */}
                                    <circle 
                                      cx={pt.x} 
                                      cy={pt.y} 
                                      r="5.5" 
                                      fill="#10b981" 
                                      stroke="#ffffff" 
                                      strokeWidth="2.5" 
                                      className="transition-all duration-200 group-hover:scale-125"
                                    />
                                    {/* Date Label under chart */}
                                    <text 
                                      x={pt.x} 
                                      y="225" 
                                      fill="rgba(255,255,255,0.4)" 
                                      fontSize="7.5" 
                                      fontWeight="black" 
                                      textAnchor="middle"
                                    >
                                      {pt.date}
                                    </text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    ) : (
                      <div className="text-center font-medium italic text-muted-foreground text-xs py-8">
                        No quiz scores recorded to generate graphs yet.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 pt-4 flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                    <span>* Hover over data points to check exam name and credits</span>
                    <span>Total Exams Mapped: {chartDataPoints.length}</span>
                  </div>
                </div>
              </div>

              {/* Individual Test Reports Section */}
              <section className="space-y-6 text-left">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h2 className="text-xl font-black flex items-center gap-3 text-white">
                    <FileText className="w-5 h-5 text-primary" /> Individual Assessment Report Cards
                  </h2>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {allResults.filter(r => r.score !== -1 && r.score !== -2).length} Available
                  </span>
                </div>
                
                <div className="grid gap-4">
                  {allQuizzes
                    .filter((q: any) => q.result && q.result.score !== -1 && q.result.score !== -2)
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((quiz: any) => {
                      const result = quiz.result;
                      return (
                        <div 
                          key={quiz.id}
                          className="glass p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-white">{quiz.title}</h4>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 font-bold">
                                Completed on {quiz.date} • {quiz.questions?.length || 0} Qs • Score: {result.score}% ({result.correct}/{result.total})
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                const rankImpactMap = calculateRankProgression(batchStudents, batchResults, allQuizzes);
                                const studentRankImpact = rankImpactMap[student.rollNumber] || {};
                                const quizRankImpact = studentRankImpact[quiz.id] || null;
                                
                                const formattedStudent = {
                                  ...student,
                                  id: student.id || student.rollNumber,
                                  name: student.name,
                                  rollNumber: student.rollNumber,
                                  batch: student.batch || '3rd Year Super 50',
                                  domain: domain || student.domain || 'all'
                                };
                                
                                downloadSingleReportCard(
                                  formattedStudent,
                                  result,
                                  quiz,
                                  quizRankImpact
                                );
                              } catch (err) {
                                console.error("Failed to generate individual report:", err);
                                alert("Failed to download PDF report. Please try again.");
                              }
                            }}
                            variant="outline"
                            className="h-11 px-6 rounded-xl text-xs font-black uppercase tracking-wider border-white/10 hover:bg-white/5 text-white flex items-center gap-2 shrink-0"
                          >
                            <Download className="w-4 h-4 text-primary" /> Report PDF
                          </Button>
                        </div>
                      );
                    })}
                  
                  {allQuizzes.filter((q: any) => q.result && q.result.score !== -1 && q.result.score !== -2).length === 0 && (
                    <div className="glass p-10 rounded-[2.5rem] border border-white/5 text-center text-muted-foreground font-medium italic">
                      No assessment reports are available yet. Complete assessments to unlock detailed performance reports.
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
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
              <div className="h-10 w-[1px] bg-white/10" />
              <div className="text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Time Spent</p>
                <p className="text-2xl font-black text-amber-400">
                  {(() => {
                    const totalSecs = result.time_taken || 0;
                    const mins = Math.floor(totalSecs / 60);
                    const secs = totalSecs % 60;
                    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                  })()}
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
