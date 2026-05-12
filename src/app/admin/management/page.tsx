"use client";

export const dynamic = "force-dynamic";

import * as XLSX from 'xlsx';


import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  UserPlus, 
  Trash2, 
  FileText, 
  Search, 
  ChevronLeft,
  ShieldAlert,
  Mail,
  Calendar,
  Clock,
  Download,
  BarChart3,
  CheckCircle,
  XCircle,
  ArrowRight,
  LayoutGrid,
  TrendingUp,
  FileDown,
  User,
  ShieldCheck,
  ExternalLink,
  Timer,
  Filter,
  MoreVertical,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export default function AdminManagementPage() {
  const [activeTab, setActiveTab] = useState<"students" | "quizzes" | "results">("students");
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [selectedQuizForPreview, setSelectedQuizForPreview] = useState<any>(null);
  const [selectedQuizForGrades, setSelectedQuizForGrades] = useState<string | null>(null);
  const [newRollNumber, setNewRollNumber] = useState("");
  const [bulkRollNumbers, setBulkRollNumbers] = useState("");
  const [newStudentDomain, setNewStudentDomain] = useState("cyber-security");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminSession, setAdminSession] = useState<any>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("3rd Year Super 50");


  const availableDomains = [
    { id: "cyber-security", name: "Cyber Security", color: "from-cyan-500/20 to-blue-500/20", icon: ShieldAlert },
    { id: "fsd", name: "Full Stack Development", color: "from-purple-500/20 to-pink-500/20", icon: LayoutGrid },
    { id: "aiml", name: "AI & ML", color: "from-emerald-500/20 to-teal-500/20", icon: CheckCircle },
    { id: "data-science", name: "Data Science", color: "from-orange-500/20 to-red-500/20", icon: BarChart3 },
  ];

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (!session.role) {
      window.location.href = "/auth/login";
      return;
    }

    setAdminSession(session);
    
    // Strict isolation for leaders
    const initialBatch = session.role === "super-admin" ? "3rd Year Super 50" : (session.batch || "3rd Year Super 50");
    setSelectedBatch(initialBatch);
    
    if (session.role === "domain-admin") {
      setSelectedDomain(session.domain);
    }

    fetchAllData(session, initialBatch);

    const resultsChannel = supabase.channel('results_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => fetchAllData(session, selectedBatch)).subscribe();
    const quizzesChannel = supabase.channel('quizzes_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, () => fetchAllData(session, selectedBatch)).subscribe();
    const studentsChannel = supabase.channel('students_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchAllData(session, selectedBatch)).subscribe();


    return () => {
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(quizzesChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const fetchAllData = async (session: any, batch: string) => {
    const domainFilter = session.role === "domain-admin" ? session.domain : null;


    let studentsQuery = supabase.from('students').select('*').eq('batch', batch).order('created_at', { ascending: false });
    if (domainFilter && batch === "3rd Year Super 50") studentsQuery = studentsQuery.eq('domain', domainFilter);
    const { data: sData } = await studentsQuery;
    setStudents(sData || []);

    let quizzesQuery = supabase.from('quizzes').select('*').eq('batch', batch).order('created_at', { ascending: false });
    if (domainFilter && batch === "3rd Year Super 50") {
      quizzesQuery = quizzesQuery.or(`domain.eq.${domainFilter},domain.eq.all`);
    }
    const { data: qData } = await quizzesQuery;
    setQuizzes(qData || []);

    const rollNumbers = (sData || []).map(s => s.roll_number);
    let resultsQuery = supabase.from('results')
      .select('*, quizzes(title, date)')
      .in('roll_number', rollNumbers)
      .order('timestamp', { ascending: false });
      
    if (domainFilter && batch === "3rd Year Super 50") {
      resultsQuery = resultsQuery.eq('domain', domainFilter);
    }
    
    const { data: rData } = await resultsQuery;
    setResults(rData || []);

  };

  const handleAddStudent = async () => {
    if (!newRollNumber) return;
    const domainToAssign = selectedBatch === "4th Year Super 50" ? "general" : (adminSession?.role === "domain-admin" ? adminSession.domain : newStudentDomain);
    const { error } = await supabase.from('students').insert([{ 
      roll_number: newRollNumber, 
      domain: domainToAssign, 
      batch: selectedBatch,
      name: `Student ${newRollNumber}` 
    }]);
    if (error) alert(error.message); else { setNewRollNumber(""); setIsAddModalOpen(false); fetchAllData(adminSession, selectedBatch); }
  };


  const removeStudent = async (id: string) => {
    if (!confirm("Remove student?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) fetchAllData(adminSession, selectedBatch);
  };

  const handleBulkImport = async () => {
    if (!bulkRollNumbers.trim()) return;
    
    const rollNumbers = bulkRollNumbers
      .split(/[\n,]/)
      .map(r => r.trim().toUpperCase())
      .filter(r => r.length > 0);

    if (rollNumbers.length === 0) return;

    const domainToAssign = selectedBatch === "4th Year Super 50" ? "general" : (adminSession?.role === "domain-admin" ? adminSession.domain : newStudentDomain);
    
    const studentsToInsert = rollNumbers.map(roll => ({
      roll_number: roll,
      domain: domainToAssign,
      batch: selectedBatch,
      name: `Student ${roll}`
    }));

    const { error } = await supabase.from('students').insert(studentsToInsert);
    
    if (error) {
      alert(`Import Failed: ${error.message}`);
    } else {
      setBulkRollNumbers("");
      setIsBulkModalOpen(false);
      fetchAllData(adminSession, selectedBatch);
      alert(`Successfully imported ${rollNumbers.length} students.`);
    }
  };

  const clearBatch = async () => {
    const confirmMessage = adminSession?.role === "super-admin" && !selectedDomain 
      ? `Are you sure you want to delete ALL students in ${selectedBatch} across ALL domains?`
      : `Are you sure you want to delete ALL students in ${selectedBatch}?`;
      
    if (!confirm(confirmMessage)) return;

    let query = supabase.from('students').delete().eq('batch', selectedBatch);
    
    if (adminSession?.role === "domain-admin") {
      query = query.eq('domain', adminSession.domain);
    } else if (selectedDomain) {
      query = query.eq('domain', selectedDomain);
    }

    const { error } = await query;
    if (error) {
      alert(`Error clearing batch: ${error.message}`);
    } else {
      fetchAllData(adminSession, selectedBatch);
    }
  };


  const deleteQuiz = async (id: string) => {
    if (!confirm("Delete quiz?")) return;
    await supabase.from('results').delete().eq('quiz_id', id);
    await supabase.from('quizzes').delete().eq('id', id);
    fetchAllData(adminSession, selectedBatch);
  };


  const downloadExcel = (data: any[] = results) => {
    if (data.length === 0) {
      alert("No data available to download.");
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Group data by domain
    const domains = Array.from(new Set(data.map(r => r.domain || 'general')));

    domains.forEach(domain => {
      const domainData = data.filter(r => (r.domain || 'general') === domain);
      
      const sheetData = domainData.map(r => ({
        "Roll Number": r.roll_number,
        "Test Name": r.quizzes?.title || "System Test",
        "Domain": domain.replace('-', ' ').toUpperCase(),
        "Score %": `${r.score}%`,
        "Correct": r.correct,
        "Incorrect": r.incorrect,
        "Total Questions": r.total,
        "Time Taken": formatTime(r.time_taken),
        "Date": new Date(r.timestamp).toLocaleDateString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      
      // Auto-size columns
      const maxWidths = Object.keys(sheetData[0] || {}).map(key => {
        return Math.max(
          key.length,
          ...sheetData.map(row => String(row[key as keyof typeof row] || '').length)
        );
      });
      worksheet['!cols'] = maxWidths.map(w => ({ wch: w + 2 }));

      XLSX.utils.book_append_sheet(workbook, worksheet, domain.replace('-', ' ').toUpperCase().slice(0, 31));
    });

    const quizTitle = data[0]?.quizzes?.title || "Consolidated";
    XLSX.writeFile(workbook, `${quizTitle}_Report.xlsx`);
  };


  const getStudentScoreForQuiz = (rollNumber: string, quizId: string) => {
    const result = results.find(r => r.roll_number === rollNumber && r.quiz_id === quizId);
    return result ? result.score : null;
  };

  const filteredStudents = students.filter(s => 
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (selectedDomain ? s.domain === selectedDomain : true)
  );

  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (selectedDomain ? q.domain === selectedDomain : true)
  );

  const filteredResults = results.filter(r => 
    (r.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) || 
     r.quizzes?.title?.toLowerCase().includes(searchQuery.toLowerCase())) && 
    (selectedDomain && selectedBatch === "3rd Year Super 50" ? r.domain === selectedDomain : true)
  );


  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href = "/admin/super"} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-4xl font-black tracking-tighter">System Management</h1>
              <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">
                {adminSession?.role === "super-admin" ? "Super Admin Access" : `Leader: ${adminSession?.domain?.replace('-', ' ')}`}
              </p>
            </div>
          </div>

          {adminSession?.role === "super-admin" && (
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-xl">
              {["3rd Year Super 50", "4th Year Super 50"].map((batch) => (
                <button
                  key={batch}
                  onClick={() => {
                    setSelectedBatch(batch);
                    fetchAllData(adminSession, batch);
                  }}
                  className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all ${
                    selectedBatch === batch ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'
                  }`}
                >
                  {batch}
                </button>
              ))}
            </div>
          )}


          
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {["students", "quizzes", "results"].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Super Admin Domain Tabs - Only for Super Admin in 3rd Year */}
        {adminSession?.role === "super-admin" && selectedBatch === "3rd Year Super 50" && (
          <div className="flex flex-wrap gap-3 pb-2 overflow-x-auto no-scrollbar">
            <Button variant={selectedDomain === null ? "default" : "glass"} onClick={() => setSelectedDomain(null)} className="rounded-full px-6 h-10 gap-2 border-white/5">
              <LayoutGrid className="w-4 h-4" /> All Domains
            </Button>
            {availableDomains.map(d => (
              <Button key={d.id} variant={selectedDomain === d.id ? "default" : "glass"} onClick={() => setSelectedDomain(d.id)} className={`rounded-full px-6 h-10 gap-2 border-white/5 ${selectedDomain === d.id ? 'bg-primary shadow-lg shadow-primary/20' : ''}`}>
                <d.icon className="w-4 h-4" /> {d.name}
              </Button>
            ))}
          </div>
        )}


        {/* Search & Actions Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-12 pl-12 pr-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-1 ring-primary outline-none" />
            </div>
          </div>
          
          {activeTab === "students" && (
            <div className="flex flex-wrap gap-4">
               <select 
                value={selectedQuizForGrades || ""} 
                onChange={(e) => setSelectedQuizForGrades(e.target.value || null)}
                className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-xs font-bold outline-none cursor-pointer hover:bg-white/10 transition-all text-primary"
               >
                 <option value="" className="bg-[#050505]">View Overall List</option>
                 {quizzes.map(q => <option key={q.id} value={q.id} className="bg-[#050505]">{q.title} ({q.date})</option>)}
               </select>

               <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <Button onClick={() => setIsAddModalOpen(true)} variant="ghost" className="h-10 rounded-lg gap-2 font-bold px-4 hover:bg-white/10">
                  <UserPlus className="w-4 h-4" /> Add
                </Button>
                <Button onClick={() => setIsBulkModalOpen(true)} variant="ghost" className="h-10 rounded-lg gap-2 font-bold px-4 hover:bg-white/10 text-primary">
                  <Upload className="w-4 h-4" /> Bulk Import
                </Button>
                <Button onClick={clearBatch} variant="ghost" className="h-10 rounded-lg gap-2 font-bold px-4 hover:bg-red-500/10 text-red-400">
                  <Trash2 className="w-4 h-4" /> Clear Batch
                </Button>
               </div>
            </div>
          )}

          {activeTab === "results" && (
            <Button onClick={() => downloadExcel()} className="h-12 rounded-xl gap-2 font-bold px-8 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          )}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === "students" && (
            <motion.div key="students" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
              
              {/* Conditional Gradebook View */}
              {selectedQuizForGrades && (
                <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-primary">Assessment Gradebook</h2>
                    <p className="text-sm text-muted-foreground">Showing performance for: <span className="text-white font-bold">{quizzes.find(q => q.id === selectedQuizForGrades)?.title}</span></p>
                  </div>
                  <Button variant="glass" onClick={() => downloadExcel(results.filter(r => r.quiz_id === selectedQuizForGrades))} className="rounded-xl border-white/10">
                    <Download className="w-4 h-4 mr-2" /> Download Quiz Report
                  </Button>
                </div>
              )}

              {adminSession?.role === "super-admin" && selectedDomain === null && selectedBatch === "3rd Year Super 50" ? (
                availableDomains.map(domain => {

                  const domainStudents = students.filter(s => s.domain === domain.id && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()));
                  if (domainStudents.length === 0 && searchQuery) return null;
                  return (
                    <div key={domain.id} className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><domain.icon className="w-4 h-4" /></div>
                        <h2 className="text-xl font-bold tracking-tight">{domain.name}</h2>
                        <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-muted-foreground font-black">{domainStudents.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {domainStudents.map(student => {
                          const score = selectedQuizForGrades ? getStudentScoreForQuiz(student.roll_number, selectedQuizForGrades) : null;
                          return (
                            <div key={student.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group relative overflow-hidden">
                              <div className="flex items-center gap-4 relative z-10">
                                <User className="w-5 h-5 text-muted-foreground" />
                                <div>
                                  <p className="font-bold">{student.roll_number}</p>
                                  {score === null && selectedQuizForGrades && <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">Not Attempted</p>}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 relative z-10">
                                {score !== null && (
                                  <div className="text-right">
                                    <p className={`text-xl font-black ${score >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{score}%</p>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Score</p>
                                  </div>
                                )}
                                <Button variant="ghost" onClick={() => removeStudent(student.id)} className="w-8 h-8 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                              {score !== null && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map(student => {
                    const score = selectedQuizForGrades ? getStudentScoreForQuiz(student.roll_number, selectedQuizForGrades) : null;
                    return (
                      <div key={student.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                          <User className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-bold">{student.roll_number}</p>
                            <p className="text-[10px] uppercase font-black text-primary tracking-widest">{student.domain}</p>
                            {score === null && selectedQuizForGrades && <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-1">Not Attempted</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                          {score !== null && (
                            <div className="text-right">
                              <p className={`text-xl font-black ${score >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{score}%</p>
                              <p className="text-[10px] text-muted-foreground font-bold uppercase">Score</p>
                            </div>
                          )}
                          <Button variant="ghost" onClick={() => removeStudent(student.id)} className="w-8 h-8 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {score !== null && <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "quizzes" && (
            <motion.div key="quizzes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
               {filteredQuizzes.map((q) => (
                  <div 
                    key={q.id} 
                    onClick={() => setSelectedQuizForPreview(q)}
                    className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group cursor-pointer hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{q.title}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {q.time} - {q.end_time || '23:59'}</p>
                          <p className="text-[10px] uppercase font-black text-primary tracking-tighter">
                            {q.domain === 'all' ? 'All Domains' : q.domain.replace('-', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-4 hidden sm:block">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Questions</p>
                        <p className="font-black text-primary">{q.questions?.length || 0}</p>
                      </div>
                      <Button variant="ghost" onClick={(e) => { e.stopPropagation(); deleteQuiz(q.id); }} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-xl">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
               ))}
            </motion.div>
          )}

          {activeTab === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
               {filteredResults.map((res) => (
                 <div key={res.id} onClick={() => setSelectedResult(res)} className="glass p-6 rounded-3xl border border-white/5 grid grid-cols-1 md:grid-cols-12 items-center hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="md:col-span-3 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{res.roll_number.slice(-2)}</div>
                      <div><p className="font-bold">{res.roll_number}</p><p className="text-[10px] uppercase font-black text-muted-foreground">{res.domain === 'all' ? 'All Domains' : res.domain.replace('-', ' ')}</p></div>

                    </div>
                    <div className="md:col-span-4 border-l border-white/5 pl-6">
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Test Name</p>
                      <p className="font-bold truncate">{res.quizzes?.title || "System Quiz"}</p>
                    </div>
                    <div className="md:col-span-2 text-center">
                      <p className="text-xs text-muted-foreground font-bold uppercase">Score</p>
                      <p className={`text-xl font-black ${res.score >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{res.score}%</p>
                    </div>
                    <div className="md:col-span-2 text-right opacity-60"><p className="text-xs font-bold">{new Date(res.timestamp).toLocaleDateString()}</p></div>
                    <div className="md:col-span-1 flex justify-end"><ExternalLink className="w-5 h-5 text-muted-foreground" /></div>
                 </div>
               ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result Details Modal (Existing) */}
        <AnimatePresence>
          {selectedResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedResult(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div layoutId={selectedResult.id} className="relative w-full max-w-2xl glass rounded-[3rem] border border-white/10 shadow-2xl p-12">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><User className="w-6 h-6" /></div>
                    <div><h2 className="text-3xl font-black">{selectedResult.roll_number}</h2><p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{selectedResult.domain}</p></div>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedResult(null)}>✕</Button>
                </div>
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="glass p-6 rounded-3xl text-center"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Score</p><p className="text-4xl font-black text-primary">{selectedResult.score}%</p></div>
                  <div className="glass p-6 rounded-3xl text-center"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Accuracy</p><p className="text-4xl font-black text-emerald-400">{Math.round((selectedResult.correct / selectedResult.total) * 100)}%</p></div>
                  <div className="glass p-6 rounded-3xl text-center"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Time</p><p className="text-4xl font-black text-orange-400">{formatTime(selectedResult.time_taken)}</p></div>
                </div>
                <Button onClick={() => downloadExcel([selectedResult])} className="w-full h-14 rounded-2xl font-bold bg-primary">Download Individual Report</Button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Quiz Preview Modal */}
        <AnimatePresence>
          {selectedQuizForPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedQuizForPreview(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative w-full max-w-4xl max-h-[85vh] glass rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <div>
                    <h2 className="text-3xl font-black">{selectedQuizForPreview.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1 uppercase font-bold tracking-widest">{selectedQuizForPreview.domain} | {selectedQuizForPreview.questions?.length || 0} Questions</p>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedQuizForPreview(null)} className="rounded-full w-12 h-12 p-0 hover:bg-white/10">✕</Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-8 premium-scroll">
                  {selectedQuizForPreview.questions?.map((q: any, idx: number) => (
                    <div key={idx} className="space-y-4 p-6 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex gap-4">
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">{idx + 1}</span>
                        <h3 className="text-lg font-medium">{q.text}</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-12">
                        {q.options.map((opt: any, oIdx: number) => (
                          <div 
                            key={oIdx} 
                            className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
                              q.correctAnswer === oIdx 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-white/5 border-white/5 text-muted-foreground'
                            }`}
                          >
                            <span>{typeof opt === 'string' ? opt : opt.text}</span>
                            {q.correctAnswer === oIdx && <CheckCircle className="w-4 h-4" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Student Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
                <h2 className="text-2xl font-black mb-6">Add New Student</h2>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Roll Number</Label>
                    <Input placeholder="e.g. 21471A0501" value={newRollNumber} onChange={(e) => setNewRollNumber(e.target.value.toUpperCase())} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                  </div>
                  
                  {selectedBatch === "3rd Year Super 50" && adminSession?.role === "super-admin" && (
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Assign Domain</Label>
                      <select 
                        value={newStudentDomain} 
                        onChange={(e) => setNewStudentDomain(e.target.value)}
                        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-bold outline-none cursor-pointer"
                      >
                        {availableDomains.map(d => <option key={d.id} value={d.id} className="bg-[#050505]">{d.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="pt-6 flex gap-4">
                    <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleAddStudent} className="flex-1 h-12 rounded-xl font-bold bg-primary shadow-lg shadow-primary/20">Add Student</Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Bulk Import Modal */}
        <AnimatePresence>
          {isBulkModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsBulkModalOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl glass p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black">Bulk Import</h2>
                    <p className="text-sm text-muted-foreground">Importing into <span className="text-white font-bold">{selectedBatch}</span></p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Paste Roll Numbers</Label>
                    <p className="text-[10px] text-muted-foreground mb-2">Separate numbers by new lines or commas</p>
                    <textarea 
                      value={bulkRollNumbers}
                      onChange={(e) => setBulkRollNumbers(e.target.value)}
                      placeholder="23471A6101&#10;23471A6102&#10;23471A6103..."
                      className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-mono focus:ring-1 ring-primary outline-none resize-none premium-scroll"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button variant="ghost" onClick={() => setIsBulkModalOpen(false)} className="flex-1 h-14 rounded-2xl font-bold">Cancel</Button>
                    <Button onClick={handleBulkImport} className="flex-1 h-14 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20">
                      Import {bulkRollNumbers.split(/[\n,]/).filter(r => r.trim()).length} Students
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
