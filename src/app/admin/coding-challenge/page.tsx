"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Search, 
  ChevronLeft,
  Download,
  Users,
  Timer,
  AlertTriangle,
  Camera,
  Filter,
  Terminal,
  Activity,
  Laptop
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function AdminCodingChallengePage() {
  const [results, setResults] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuizId, setSelectedQuizId] = useState<string>("all");
  const [adminSession, setAdminSession] = useState<any>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (!session.role) {
      window.location.href = "/auth/login";
      return;
    }
    setAdminSession(session);
    fetchData();

    // Set up Realtime listener to auto-refresh
    const channel = supabase.channel('coding_challenge_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all quizzes
      const { data: allQuizzes, error: qError } = await supabase
        .from('quizzes')
        .select('*');

      if (qError) throw qError;

      // Filter coding quizzes
      const codingQuizzes = allQuizzes?.filter(q => 
        q.questions?.some((quest: any) => quest.type === "CODING")
      ) || [];
      
      setQuizzes(codingQuizzes);

      const codingQuizIds = codingQuizzes.map(q => q.id);

      if (codingQuizIds.length === 0) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch results for coding quizzes
      const { data: resultsData, error: rError } = await supabase
        .from('results')
        .select('*')
        .in('quiz_id', codingQuizIds)
        .order('timestamp', { ascending: false });

      if (rError) throw rError;

      // Attach quiz details to each result
      const enrichedResults = resultsData?.map(res => {
        const correspondingQuiz = codingQuizzes.find(q => q.id === res.quiz_id);
        
        // Parse camera status from domain column (format: domain|cam-on or domain|cam-off)
        let cameraStatus = "Camera Off";
        let actualDomain = res.domain || "general";
        
        if (res.domain && res.domain.includes('|')) {
          const parts = res.domain.split('|');
          actualDomain = parts[0];
          cameraStatus = parts[1] === "cam-on" ? "Camera On" : "Camera Off";
        }

        return {
          ...res,
          quizTitle: correspondingQuiz?.title || "Coding Assessment",
          actualDomain,
          cameraStatus,
          // Mapping columns:
          submissions: res.correct || 0, // Number of compiler runs
          tabSwitches: res.incorrect || 0 // Tab violations
        };
      }) || [];

      setResults(enrichedResults);
    } catch (err: any) {
      console.error("Error fetching coding challenge data:", err);
      alert(`Error loading results: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logic
  const filteredResults = results.filter(r => {
    const matchesSearch = r.roll_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesQuiz = selectedQuizId === "all" ? true : r.quiz_id === selectedQuizId;
    return matchesSearch && matchesQuiz;
  });

  // Calculate statistics
  const totalSubmissions = filteredResults.length;
  
  const avgTimeTaken = totalSubmissions > 0 
    ? Math.round(filteredResults.reduce((sum, r) => sum + (r.time_taken || 0), 0) / totalSubmissions)
    : 0;

  const totalTabViolations = filteredResults.reduce((sum, r) => sum + (r.tabSwitches || 0), 0);
  
  const activeProctorCount = filteredResults.filter(r => r.cameraStatus === "Camera On").length;
  const proctorPercentage = totalSubmissions > 0
    ? Math.round((activeProctorCount / totalSubmissions) * 100)
    : 0;

  // Export to Excel sheet using SheetJS
  const downloadExcel = () => {
    if (filteredResults.length === 0) {
      alert("No data available to download.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    const sheetData = filteredResults.map(r => ({
      "Roll Number": r.roll_number,
      "Test Name": r.quizTitle,
      "Domain": r.actualDomain.replace('-', ' ').toUpperCase(),
      "Submissions": r.submissions,
      "Tab Switches": r.tabSwitches,
      "Time Taken": formatTime(r.time_taken),
      "Camera Status": r.cameraStatus,
      "Percentage Score": `${r.score}%`,
      "Date": new Date(r.timestamp).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);

    // Auto-size columns to look premium
    const maxWidths = Object.keys(sheetData[0] || {}).map(key => {
      return Math.max(
        key.length,
        ...sheetData.map(row => String(row[key as keyof typeof row] || '').length)
      );
    });
    worksheet['!cols'] = maxWidths.map(w => ({ wch: w + 3 }));

    XLSX.utils.book_append_sheet(workbook, worksheet, "CODING CHALLENGE RESULTS");
    
    const quizTitle = selectedQuizId !== "all" 
      ? (quizzes.find(q => q.id === selectedQuizId)?.title || "Coding_Challenge")
      : "Coding_Challenge_Consolidated";
      
    XLSX.writeFile(workbook, `${quizTitle.replace(/\s+/g, '_')}_Report.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#02030a] text-white p-8 space-y-10">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.location.href = "/admin/super"} 
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Coding Challenge Dashboard</h1>
            <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mt-1">
              Live Proctoring & Code Submissions Module
            </p>
          </div>
        </div>

        <Button 
          onClick={downloadExcel} 
          className="h-12 rounded-xl gap-2 font-bold px-6 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 text-white"
        >
          <Download className="w-4 h-4 text-white" /> Export Excel Report
        </Button>
      </div>

      {/* Analytics Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="glass p-6 rounded-3xl border border-white/5 flex items-center gap-4 bg-gradient-to-br from-[#0a0518] to-transparent"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-black">Total Candidates</p>
            <p className="text-3xl font-black text-white">{totalSubmissions}</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="glass p-6 rounded-3xl border border-white/5 flex items-center gap-4 bg-gradient-to-br from-[#050c18] to-transparent"
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-black">Avg Time Taken</p>
            <p className="text-3xl font-black text-white">{formatTime(avgTimeTaken)}</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="glass p-6 rounded-3xl border border-white/5 flex items-center gap-4 bg-gradient-to-br from-[#180509] to-transparent"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-black">Tab Violations</p>
            <p className="text-3xl font-black text-red-400">{totalTabViolations}</p>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="glass p-6 rounded-3xl border border-white/5 flex items-center gap-4 bg-gradient-to-br from-[#05180c] to-transparent"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase font-black">Active Proctoring</p>
            <p className="text-3xl font-black text-emerald-400">{proctorPercentage}%</p>
          </div>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search student roll number..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full h-12 pl-12 pr-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-1 ring-purple-400 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-muted-foreground">
            <Filter className="w-4 h-4" />
          </div>
          <select
            value={selectedQuizId}
            onChange={(e) => setSelectedQuizId(e.target.value)}
            className="h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-sm font-bold outline-none cursor-pointer hover:bg-white/10 transition-all text-purple-400"
          >
            <option value="all" className="bg-[#02030a] text-white">All Coding Challenges</option>
            {quizzes.map(q => (
              <option key={q.id} value={q.id} className="bg-[#02030a] text-white">{q.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass rounded-[3rem] border border-white/5 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm font-bold">Synchronizing proctor results...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 h-16 text-xs text-muted-foreground uppercase font-black tracking-wider">
                  <th className="pl-8">Roll Number</th>
                  <th>Challenge Name</th>
                  <th>Domain</th>
                  <th className="text-center">Compile Runs</th>
                  <th className="text-center">Time Taken</th>
                  <th className="text-center">Tab Switches</th>
                  <th>Proctor Camera</th>
                  <th className="text-center">Accuracy Score</th>
                  <th className="pr-8 text-right">Completion Date</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredResults.map((res) => (
                    <motion.tr 
                      key={res.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-white/5 hover:bg-white/[0.02] h-20 transition-colors text-sm"
                    >
                      <td className="pl-8 font-black text-white">{res.roll_number}</td>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-200">{res.quizTitle}</span>
                        </div>
                      </td>
                      <td className="capitalize text-muted-foreground font-medium">{res.actualDomain.replace('-', ' ')}</td>
                      <td className="text-center">
                        <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold font-mono">
                          {res.submissions}
                        </span>
                      </td>
                      <td className="text-center font-mono font-bold text-slate-300">
                        {formatTime(res.time_taken)}
                      </td>
                      <td className="text-center">
                        <span className={`px-3 py-1 rounded-full font-bold font-mono ${
                          res.tabSwitches > 0 
                            ? 'bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse' 
                            : 'bg-white/5 border border-white/5 text-muted-foreground'
                        }`}>
                          {res.tabSwitches} {res.tabSwitches > 0 ? "⚠️" : ""}
                        </span>
                      </td>
                      <td>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${
                          res.cameraStatus === "Camera On"
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                          {res.cameraStatus === "Camera On" ? "Active Proctoring ✅" : "Camera Off ❌"}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`font-black text-base ${res.score >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>
                          {res.score}%
                        </span>
                      </td>
                      <td className="pr-8 text-right text-xs text-muted-foreground font-bold font-mono">
                        {new Date(res.timestamp).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>

            {filteredResults.length === 0 && (
              <div className="text-center py-20">
                <Laptop className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-bold italic">No coding challenge results found matching the filters.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
