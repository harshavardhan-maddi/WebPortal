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
  LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatTime } from "@/lib/utils";

export default function AdminManagementPage() {
  const [activeTab, setActiveTab] = useState<"students" | "quizzes" | "results">("students");
  const [students, setStudents] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
    const adminRole = session.role || "super-admin";
    const adminDomain = session.domain || "all";

    const currentGlobal = JSON.parse(localStorage.getItem("global_students") || "[]");
    const savedQuizzes = JSON.parse(localStorage.getItem("global_quizzes") || "[]");
    const savedResults = JSON.parse(localStorage.getItem("global_results") || "[]");

    let filteredS = currentGlobal;
    let filteredQ = savedQuizzes;
    let filteredR = savedResults;

    if (adminRole === "domain-admin") {
      filteredS = currentGlobal.filter((s: any) => s.domain === adminDomain);
      filteredQ = savedQuizzes.filter((q: any) => q.domain === adminDomain);
      filteredR = savedResults.filter((r: any) => r.domain === adminDomain);
      setSelectedDomain(adminDomain); // Domain leaders are locked to their domain
    }

    setStudents(filteredS);
    setQuizzes(filteredQ);
    setResults(filteredR);
  }, []);

  const handleAddStudent = () => {
    if (!newRollNumber) return;
    
    const fullGlobal = JSON.parse(localStorage.getItem("global_students") || "[]");
    if (fullGlobal.some((s: any) => s.rollNumber.toLowerCase() === newRollNumber.toLowerCase())) {
      alert("Student already exists!");
      return;
    }

    const domainToAssign = adminSession?.role === "domain-admin" ? adminSession.domain : newStudentDomain;
    const newStudent = { id: Date.now().toString(), name: `Student ${newRollNumber}`, rollNumber: newRollNumber, email: `${newRollNumber}@nrtec.in`, password: newRollNumber, domain: domainToAssign };
    
    const updatedGlobal = [...fullGlobal, newStudent];
    localStorage.setItem("global_students", JSON.stringify(updatedGlobal));
    
    // Update local state based on current filter
    if (adminSession?.role === "super-admin") {
      if (selectedDomain === domainToAssign || !selectedDomain) {
        setStudents(prev => [...prev, newStudent]);
      }
    } else {
      setStudents(prev => [...prev, newStudent]);
    }

    setNewRollNumber("");
    setIsAddModalOpen(false);
  };

  const removeStudent = (id: string) => {
    if (!confirm("Remove student?")) return;
    const fullGlobal = JSON.parse(localStorage.getItem("global_students") || "[]");
    const updatedGlobal = fullGlobal.filter((s: any) => s.id !== id);
    localStorage.setItem("global_students", JSON.stringify(updatedGlobal));
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const downloadExcel = () => {
    if (results.length === 0) return;
    const headers = ["Roll Number", "Domain", "Score %", "Correct", "Incorrect", "Time Taken", "Date"];
    const csvContent = [headers.join(","), ...results.map(r => [r.rollNumber, r.domain, r.score, r.correct, r.incorrect, formatTime(r.timeTaken), new Date(r.timestamp).toLocaleDateString()].join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Results_${new Date().toLocaleDateString()}.csv`);
    link.click();
  };

  const getStudentCount = (domainId: string) => {
    const fullGlobal = JSON.parse(localStorage.getItem("global_students") || "[]");
    return fullGlobal.filter((s: any) => s.domain === domainId).length;
  };

  const filteredStudents = students.filter(s => 
    s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) && 
    (selectedDomain ? s.domain === selectedDomain : true)
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
                onClick={() => { setActiveTab(tab as any); if (adminSession?.role === "super-admin") setSelectedDomain(null); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all capitalize ${activeTab === tab ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted-foreground hover:text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {adminSession?.role === "super-admin" && selectedDomain && activeTab === "students" && (
              <Button variant="glass" onClick={() => setSelectedDomain(null)} className="rounded-xl h-12 px-4 gap-2 border-white/10">
                <ChevronLeft className="w-4 h-4" /> Domains
              </Button>
            )}
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
              <UserPlus className="w-4 h-4" /> Add New Student
            </Button>
          )}

          {activeTab === "results" && (
            <Button onClick={downloadExcel} className="h-12 rounded-xl gap-2 font-bold px-8 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20">
              <Download className="w-4 h-4" /> Download Excel Report
            </Button>
          )}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === "students" && (
            <motion.div key="students-view">
              {/* Domain Grid for Super Admin */}
              {adminSession?.role === "super-admin" && !selectedDomain ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {availableDomains.map((domain) => (
                    <motion.div
                      key={domain.id}
                      whileHover={{ y: -5, borderColor: "rgba(255,255,255,0.2)" }}
                      onClick={() => setSelectedDomain(domain.id)}
                      className="glass p-8 rounded-[2.5rem] border border-white/5 cursor-pointer group relative overflow-hidden"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${domain.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-primary">
                            <domain.icon className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold">{domain.name}</h3>
                            <p className="text-muted-foreground text-sm font-medium">{getStudentCount(domain.id)} Registered Students</p>
                          </div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-white transition-all group-hover:translate-x-2" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                /* Student List View */
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
                  {filteredStudents.length === 0 ? (
                    <div className="p-20 text-center glass rounded-[2.5rem] border-dashed border-white/10">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground">No students found in this domain.</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <div key={student.id} className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors group">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl tracking-tight">{student.rollNumber}</h3>
                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{student.domain.replace('-', ' ')}</p>
                          </div>
                        </div>
                        <Button variant="ghost" onClick={() => removeStudent(student.id)} className="w-12 h-12 rounded-2xl text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "quizzes" && (
            <motion.div key="quizzes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
              {quizzes.length === 0 ? (
                <div className="p-20 text-center glass rounded-[2.5rem] border-dashed border-white/10">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">No tests scheduled.</p>
                </div>
              ) : (
                quizzes.map((quiz) => (
                  <div key={quiz.id} className="glass p-6 rounded-3xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors group">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{quiz.title}</h3>
                        <p className="text-xs text-muted-foreground uppercase font-bold">{quiz.domain.replace('-', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === "results" && (
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4">
              {results.length === 0 ? (
                <div className="p-20 text-center glass rounded-[2.5rem] border-dashed border-white/10">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">No results recorded.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   {results.map((res) => (
                    <div key={res.id} className="glass p-6 rounded-3xl border border-white/5 grid grid-cols-5 items-center hover:border-white/10 transition-colors">
                      <span className="font-bold text-lg">{res.rollNumber}</span>
                      <span className="text-primary font-bold">{res.score}%</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> {res.correct}</span>
                        <span className="flex items-center gap-1 text-red-400"><XCircle className="w-3 h-3" /> {res.incorrect}</span>
                      </div>
                      <span className="text-muted-foreground text-sm font-medium">{res.domain.replace('-', ' ')}</span>
                      <span className="text-muted-foreground text-sm text-right">{formatTime(res.timeTaken)}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Student Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/10 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4"><UserPlus className="w-8 h-8" /></div>
                  <h3 className="text-2xl font-bold">Add New Student</h3>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input placeholder="e.g. 24471A4652" value={newRollNumber} onChange={(e) => setNewRollNumber(e.target.value)} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign Domain</Label>
                    <select className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm outline-none cursor-pointer disabled:opacity-50" disabled={adminSession?.role === "domain-admin"} value={adminSession?.role === "domain-admin" ? adminSession.domain : newStudentDomain} onChange={(e) => setNewStudentDomain(e.target.value)}>
                      {availableDomains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1 h-12 rounded-xl">Cancel</Button>
                    <Button onClick={handleAddStudent} className="flex-1 h-12 rounded-xl font-bold">Create Account</Button>
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
