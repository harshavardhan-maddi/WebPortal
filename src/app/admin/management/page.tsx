"use client";

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
  Filter
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
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [newRollNumber, setNewRollNumber] = useState("");
  const [newStudentDomain, setNewStudentDomain] = useState("cyber-security");
  const [searchQuery, setSearchQuery] = useState("");
  const [adminSession, setAdminSession] = useState<any>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const availableDomains = [
    { id: "cyber-security", name: "Cyber Security", color: "from-cyan-500/20 to-blue-500/20", icon: ShieldAlert },
    { id: "fsd", name: "Full Stack Development", color: "from-purple-500/20 to-pink-500/20", icon: LayoutGrid },
    { id: "aiml", name: "AI & ML", color: "from-emerald-500/20 to-teal-500/20", icon: CheckCircle },
    { id: "data-science", name: "Data Science", color: "from-orange-500/20 to-red-500/20", icon: BarChart3 },
  ];

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    setAdminSession(session);
    
    if (session.role === "domain-admin") {
      setSelectedDomain(session.domain);
    }

    fetchAllData(session);

    const resultsChannel = supabase
      .channel('results_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results' }, () => fetchAllData(session))
      .subscribe();

    const quizzesChannel = supabase
      .channel('quizzes_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, () => fetchAllData(session))
      .subscribe();

    const studentsChannel = supabase
      .channel('students_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchAllData(session))
      .subscribe();

    return () => {
      supabase.removeChannel(resultsChannel);
      supabase.removeChannel(quizzesChannel);
      supabase.removeChannel(studentsChannel);
    };
  }, []);

  const fetchAllData = async (session: any) => {
    const domainFilter = session.role === "domain-admin" ? session.domain : null;

    let studentsQuery = supabase.from('students').select('*').order('created_at', { ascending: false });
    if (domainFilter) studentsQuery = studentsQuery.eq('domain', domainFilter);
    const { data: sData } = await studentsQuery;
    setStudents(sData || []);

    let quizzesQuery = supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (domainFilter) quizzesQuery = quizzesQuery.eq('domain', domainFilter);
    const { data: qData } = await quizzesQuery;
    setQuizzes(qData || []);

    let resultsQuery = supabase.from('results').select('*, quizzes(title, date)').order('timestamp', { ascending: false });
    if (domainFilter) resultsQuery = resultsQuery.eq('domain', domainFilter);
    const { data: rData } = await resultsQuery;
    setResults(rData || []);
  };

  const handleAddStudent = async () => {
    if (!newRollNumber) return;
    const domainToAssign = adminSession?.role === "domain-admin" ? adminSession.domain : newStudentDomain;
    const { error } = await supabase.from('students').insert([{ roll_number: newRollNumber, domain: domainToAssign, name: `Student ${newRollNumber}` }]);
    if (error) alert(error.message); else { setNewRollNumber(""); setIsAddModalOpen(false); fetchAllData(adminSession); }
  };

  const removeStudent = async (id: string) => {
    if (!confirm("Remove student?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) fetchAllData(adminSession);
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from('results').delete().eq('quiz_id', id);
    const { error } = await supabase.from('quizzes').delete().eq('id', id);
    if (!error) fetchAllData(adminSession);
  };

  const downloadExcel = (data: any[] = results) => {
    if (data.length === 0) return;
    const headers = ["Roll Number", "Test Name", "Domain", "Score %", "Correct", "Incorrect", "Time Taken", "Date"];
    const csvContent = [headers.join(","), ...data.map(r => [r.roll_number, r.quizzes?.title, r.domain, r.score, r.correct, r.incorrect, formatTime(r.time_taken), new Date(r.timestamp).toLocaleDateString()].join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Report.csv`;
    link.click();
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
    (selectedDomain ? r.domain === selectedDomain : true)
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

        {/* Super Admin Domain Tabs */}
        {adminSession?.role === "super-admin" && (
          <div className="flex flex-wrap gap-3 pb-2 overflow-x-auto no-scrollbar">
            <Button 
              variant={selectedDomain === null ? "default" : "glass"} 
              onClick={() => setSelectedDomain(null)}
              className="rounded-full px-6 h-10 gap-2 border-white/5"
            >
              <LayoutGrid className="w-4 h-4" /> All Domains
            </Button>
            {availableDomains.map(d => (
              <Button 
                key={d.id}
                variant={selectedDomain === d.id ? "default" : "glass"} 
                onClick={() => setSelectedDomain(d.id)}
                className={`rounded-full px-6 h-10 gap-2 border-white/5 ${selectedDomain === d.id ? 'bg-primary shadow-lg shadow-primary/20' : ''}`}
              >
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
              <input 
                type="text" 
                placeholder={`Search ${activeTab}...`} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white/5 rounded-2xl border border-white/10 focus:ring-1 ring-primary outline-none"
              />
            </div>
          </div>
          
          {activeTab === "students" && (
            <Button onClick={() => setIsAddModalOpen(true)} className="h-12 rounded-xl gap-2 font-bold px-8 shadow-lg shadow-primary/20">
              <UserPlus className="w-4 h-4" /> Add Student
            </Button>
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
              {/* Grouped View for Super Admin */}
              {adminSession?.role === "super-admin" && selectedDomain === null ? (
                availableDomains.map(domain => {
                  const domainStudents = students.filter(s => s.domain === domain.id && s.roll_number.toLowerCase().includes(searchQuery.toLowerCase()));
                  if (domainStudents.length === 0 && searchQuery) return null;
                  return (
                    <div key={domain.id} className="space-y-4">
                      <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          <domain.icon className="w-4 h-4" />
                        </div>
                        <h2 className="text-xl font-bold tracking-tight">{domain.name}</h2>
                        <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-muted-foreground font-black">{domainStudents.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {domainStudents.map(student => (
                          <div key={student.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <User className="w-5 h-5 text-muted-foreground" />
                              <span className="font-bold">{student.roll_number}</span>
                            </div>
                            <Button variant="ghost" onClick={() => removeStudent(student.id)} className="w-8 h-8 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        {domainStudents.length === 0 && <div className="col-span-full p-8 text-center text-muted-foreground text-sm glass rounded-2xl border-dashed border-white/5">No students in this domain.</div>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map(student => (
                    <div key={student.id} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-bold">{student.roll_number}</p>
                          <p className="text-[10px] uppercase font-black text-primary tracking-widest">{student.domain}</p>
                        </div>
                      </div>
                      <Button variant="ghost" onClick={() => removeStudent(student.id)} className="w-8 h-8 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && <div className="col-span-full p-20 text-center text-muted-foreground glass rounded-[3rem] border-dashed border-white/10">No students found.</div>}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "quizzes" && (
            <motion.div key="quizzes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
               {filteredQuizzes.map((q) => (
                  <div key={q.id} className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <Calendar className="w-6 h-6 text-purple-400" />
                      <div>
                        <p className="font-bold">{q.title}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {q.time} - {q.end_time || '23:59'}</p>
                          <p className="text-[10px] uppercase font-black text-primary tracking-tighter">{q.domain}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => deleteQuiz(q.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-5 h-5" /></Button>
                  </div>
               ))}
               {filteredQuizzes.length === 0 && <div className="p-20 text-center text-muted-foreground glass rounded-[3rem] border-dashed border-white/10">No quizzes found.</div>}
            </motion.div>
          )}

          {activeTab === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
               {filteredResults.map((res) => (
                 <div key={res.id} onClick={() => setSelectedResult(res)} className="glass p-6 rounded-3xl border border-white/5 grid grid-cols-1 md:grid-cols-12 items-center hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="md:col-span-3 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{res.roll_number.slice(-2)}</div>
                      <div>
                        <p className="font-bold">{res.roll_number}</p>
                        <p className="text-[10px] uppercase font-black text-muted-foreground">{res.domain}</p>
                      </div>
                    </div>
                    <div className="md:col-span-4 border-l border-white/5 pl-6">
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Test Name</p>
                      <p className="font-bold truncate">{res.quizzes?.title || "System Quiz"}</p>
                    </div>
                    <div className="md:col-span-2 text-center">
                      <p className="text-xs text-muted-foreground font-bold uppercase">Score</p>
                      <p className={`text-xl font-black ${res.score >= 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{res.score}%</p>
                    </div>
                    <div className="md:col-span-2 text-right opacity-60">
                      <p className="text-xs font-bold">{new Date(res.timestamp).toLocaleDateString()}</p>
                    </div>
                    <div className="md:col-span-1 flex justify-end"><ExternalLink className="w-5 h-5 text-muted-foreground" /></div>
                 </div>
               ))}
               {filteredResults.length === 0 && <div className="p-20 text-center text-muted-foreground glass rounded-[3rem] border-dashed border-white/10">No results found.</div>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detailed Result Modal */}
        <AnimatePresence>
          {selectedResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedResult(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div layoutId={selectedResult.id} className="relative w-full max-w-2xl glass rounded-[3rem] border border-white/10 shadow-2xl p-12">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><User className="w-6 h-6" /></div>
                    <div>
                      <h2 className="text-3xl font-black">{selectedResult.roll_number}</h2>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{selectedResult.domain.replace('-', ' ')}</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => setSelectedResult(null)}>✕</Button>
                </div>
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="glass p-6 rounded-3xl text-center"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Score</p><p className="text-4xl font-black text-primary">{selectedResult.score}%</p></div>
                  <div className="glass p-6 rounded-3xl text-center"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Accuracy</p><p className="text-4xl font-black text-emerald-400">{Math.round((selectedResult.correct / selectedResult.total) * 100)}%</p></div>
                  <div className="glass p-6 rounded-3xl text-center"><p className="text-xs font-black uppercase text-muted-foreground mb-1">Time</p><p className="text-4xl font-black text-orange-400">{formatTime(selectedResult.time_taken)}</p></div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={() => downloadExcel([selectedResult])} className="flex-1 h-14 rounded-2xl font-bold bg-primary">Download Report</Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Add Student Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4"><UserPlus className="w-8 h-8" /></div>
                  <h3 className="text-2xl font-bold">Add Student</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2"><Label>Roll Number</Label><Input placeholder="e.g. 24471A4652" value={newRollNumber} onChange={(e) => setNewRollNumber(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl" /></div>
                  <div className="space-y-2">
                    <Label>Assign Domain</Label>
                    <select className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm disabled:opacity-50" disabled={adminSession?.role === "domain-admin"} value={adminSession?.role === "domain-admin" ? adminSession.domain : newStudentDomain} onChange={(e) => setNewStudentDomain(e.target.value)}>
                      {availableDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4"><Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 rounded-xl">Cancel</Button><Button onClick={handleAddStudent} className="flex-1 h-12 rounded-xl font-bold">Create Account</Button></div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
