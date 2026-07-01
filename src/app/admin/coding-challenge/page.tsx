"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download, X } from "lucide-react";
import * as XLSX from "xlsx";

/**
 * Admin Coding Challenge Dashboard
 * --------------------------------
 * Displays a table of coding challenge submissions with the following columns:
 *   - Roll Number (derived from `student_id` or `roll_number` field)
 *   - Submissions (number of compile/run attempts – stored in `correct`)
 *   - Time Taken (seconds – stored in `time_taken`)
 *   - Tab Switch Count (stored in `incorrect`)
 *   - Camera Status (derived from `domain` suffix, e.g. "fsd_cam-on")
 *   - Score (percentage – stored in `score`)
 *
 * The page also provides a live search filter and an "Export to Excel" button that
 * generates an .xlsx file using the `xlsx` library.
 */
export default function CodingChallengePage() {
  const [results, setResults] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfData, setPdfData] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDomain, setNewDomain] = useState("coding");
  
  // Custom Coding Challenge Fields
  const [problemStatement, setProblemStatement] = useState("");
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [sampleInput, setSampleInput] = useState("");
  const [sampleOutput, setSampleOutput] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["python", "javan"]);
  
  // Enforced 4 test cases
  const [testCases, setTestCases] = useState<any[]>([
    { input: "", output: "", isHidden: false },
    { input: "", output: "", isHidden: false },
    { input: "", output: "", isHidden: true },
    { input: "", output: "", isHidden: true }
  ]);

  const resetForm = () => {
    setNewTitle("");
    setNewDomain("coding");
    setProblemStatement("");
    setInputFormat("");
    setOutputFormat("");
    setSampleInput("");
    setSampleOutput("");
    setSelectedLanguages(["python", "javan"]);
    setTestCases([
      { input: "", output: "", isHidden: false },
      { input: "", output: "", isHidden: false },
      { input: "", output: "", isHidden: true },
      { input: "", output: "", isHidden: true }
    ]);
  };
// Handle PDF upload and extract properties
const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setPdfLoading(true);
  try {
    const form = new FormData();
    form.append('file', file);
    const response = await fetch('/api/pdf-extract', {
      method: 'POST',
      body: form,
    });
    const result = await response.json();
    if (result.success) {
      setPdfData(result.data);
      // Optionally prefill new challenge fields from PDF
      if (result.data.problemStatement) setProblemStatement(result.data.problemStatement);
      if (result.data.title) setNewTitle(result.data.title || "");
      if (result.data.domain) setNewDomain(result.data.domain || "");
    } else {
      console.error('PDF extraction error:', result.error);
    }
  } catch (err) {
    console.error('PDF upload failed:', err);
  } finally {
    setPdfLoading(false);
  }
};

// Handle creating a new coding challenge
const handleAddChallenge = async () => {
  if (!newTitle.trim() || !problemStatement.trim()) {
    alert("Please fill in at least the Title and Problem Statement.");
    return;
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    
    // Construct the single coding question
    const question = {
      type: "CODING",
      text: newTitle,
      problemStatement,
      inputFormat,
      outputFormat,
      sampleInput,
      sampleOutput,
      languages: selectedLanguages,
      testCases
    };

    const { error } = await supabase.from('quizzes').insert([
      {
        title: `Coding: ${newTitle}`, // prefix Coding: to trigger Coding results list filter
        domain: newDomain || "coding",
        batch: "3rd Year Super 50",
        date: today,
        time: "00:00",
        end_time: "23:59",
        questions: [question]
      },
    ]);
    if (error) {
      console.error('Failed to create challenge:', error);
      alert(`Failed to create challenge: ${error.message}`);
      return;
    }
    
    resetForm();
    setShowAddModal(false);
    window.location.reload();
  } catch (err: any) {
    console.error('Add challenge error:', err);
    alert(`Error: ${err.message}`);
  }
};
  // Fetch coding challenge results from Supabase
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      // Assuming `results` table holds all quiz results. We'll filter rows where `score` exists and
      // `domain` includes a "_cam-" suffix indicating a coding challenge (since MCQ results may also have a score).
      const { data, error } = await supabase
        .from("results")
        .select("*, quiz_id( title, domain )")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch coding results:", error);
        setLoading(false);
        return;
      }

      // Filter only coding challenge entries – we consider entries where the associated quiz has at least one CODING question.
      // For simplicity, assume that `quiz_id` points to a quiz where `questions` array contains an object with type === "CODING".
      const codingResults = data?.filter((row: any) => {
        const quiz = row.quiz_id;
        if (!quiz) return false;
        // Fetch the full quiz payload if available – we only have title/domain here, so we rely on a convention:
        // Coding quizzes are stored with a title prefix "Coding:" or domain suffix "_coding".
        // Adjust this logic based on actual schema.
        const title = quiz.title?.toString().toLowerCase() || "";
        const domain = quiz.domain?.toString().toLowerCase() || "";
        return title.includes("coding") || domain.includes("coding");
      }) || [];

      setResults(codingResults);
      setFiltered(codingResults);
      setLoading(false);
    };

    fetchResults();
  }, []);

  // Search handling
  useEffect(() => {
    const lower = search.toLowerCase();
    const filteredList = results.filter((r) => {
      const roll = (r.roll_number ?? r.student_id ?? "").toString().toLowerCase();
      const name = r.student_name?.toString().toLowerCase() || "";
      return roll.includes(lower) || name.includes(lower);
    });
    setFiltered(filteredList);
  }, [search, results]);

  const exportToExcel = () => {
    const wsData = [
      ["Roll Number", "Submissions", "Time Taken (s)", "Tab Switches", "Camera Status", "Score %"],
      ...filtered.map((r) => [
        r.roll_number ?? r.student_id ?? "-",
        r.correct ?? 0,
        r.time_taken ?? 0,
        r.incorrect ?? 0,
        // Extract camera status from domain suffix e.g. "fsd_cam-on"
        (r.domain?.match(/cam-(on|off)/) ?? ["", ""])[1] || "",
        r.score ?? 0,
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coding Challenge Results");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coding-challenge-results-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-black text-purple-400">Coding Challenge Dashboard</h2>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by roll number or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 rounded-full"
          />
        </div>
        <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Export to Excel
        </Button>
        <Button onClick={() => setShowAddModal(true)} variant="default" className="flex items-center gap-2">
          Add Challenge
        </Button>
        <label className="flex items-center gap-2 cursor-pointer bg-white/5 px-3 py-1.5 rounded-full">
          <input type="file" accept="application/pdf" hidden onChange={handlePdfUpload} />
          <span className="text-sm">Upload PDF</span>
        </label>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading results…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No coding challenge submissions found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#02030a]">
          <table className="w-full table-auto text-sm">
            <thead className="bg-[#05060f]">
              <tr>
                <th className="p-3 text-left text-muted-foreground">Roll Number</th>
                <th className="p-3 text-left text-muted-foreground">Submissions</th>
                <th className="p-3 text-left text-muted-foreground">Time Taken (s)</th>
                <th className="p-3 text-left text-muted-foreground">Tab Switches</th>
                <th className="p-3 text-left text-muted-foreground">Camera</th>
                <th className="p-3 text-left text-muted-foreground">Score %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, idx) => (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="p-3">{r.roll_number ?? r.student_id ?? "-"}</td>
                  <td className="p-3">{r.correct ?? 0}</td>
                  <td className="p-3">{r.time_taken ?? 0}</td>
                  <td className="p-3">{r.incorrect ?? 0}</td>
                  <td className="p-3">
                    {(r.domain?.match(/cam-(on|off)/) ?? ["", ""])[1] || "-"}
                  </td>
                  <td className="p-3 font-medium text-emerald-400">{r.score ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur z-50 overflow-y-auto py-10">
          <div className="bg-[#02030a] border border-white/5 p-8 rounded-[2.5rem] w-full max-w-4xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto premium-scroll relative text-white">
            <button 
              onClick={() => { setShowAddModal(false); resetForm(); }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-white/5 pb-4">
              <h2 className="text-2xl font-black text-purple-400">Create Coding Challenge</h2>
              <p className="text-xs text-muted-foreground mt-1">Fill in the fields to deploy a new code evaluation assessment.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Basic Details */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Challenge Title</label>
                  <Input placeholder="e.g. Sum of Two Numbers" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Domain / Category Tag</label>
                  <Input placeholder="e.g. coding, frontend" value={newDomain} onChange={e => setNewDomain(e.target.value)} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Problem Statement</label>
                  <textarea
                    placeholder="Describe the task, requirements, and constraints..."
                    value={problemStatement}
                    onChange={e => setProblemStatement(e.target.value)}
                    className="w-full h-36 p-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-1 ring-purple-400 outline-none resize-none text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Input Format</label>
                    <textarea
                      placeholder="Describe the standard input..."
                      value={inputFormat}
                      onChange={e => setInputFormat(e.target.value)}
                      className="w-full h-24 p-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:ring-1 ring-purple-400 outline-none resize-none text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Output Format</label>
                    <textarea
                      placeholder="Describe the expected output..."
                      value={outputFormat}
                      onChange={e => setOutputFormat(e.target.value)}
                      className="w-full h-24 p-3 bg-white/5 border border-white/10 rounded-xl text-xs focus:ring-1 ring-purple-400 outline-none resize-none text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Examples & Languages */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Sample Input</label>
                    <textarea
                      placeholder="e.g. 5 10"
                      value={sampleInput}
                      onChange={e => setSampleInput(e.target.value)}
                      className="w-full h-24 p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-xs focus:ring-1 ring-purple-400 outline-none resize-none text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Sample Output</label>
                    <textarea
                      placeholder="e.g. 15"
                      value={sampleOutput}
                      onChange={e => setSampleOutput(e.target.value)}
                      className="w-full h-24 p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-xs focus:ring-1 ring-purple-400 outline-none resize-none text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Allowed Programming Languages</label>
                  <div className="flex gap-4">
                    {["python", "javan"].map((lang) => {
                      const isSelected = selectedLanguages.includes(lang);
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setSelectedLanguages(prev => 
                              prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
                            );
                          }}
                          className={`px-5 py-2 rounded-full border text-xs font-black uppercase transition-all ${
                            isSelected 
                              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-500/20' 
                              : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white'
                          }`}
                        >
                          {lang === "python" ? "Python" : "Java"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Enforced 4 test cases */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <label className="text-[10px] font-bold uppercase text-purple-400 tracking-wider block">Evaluation Test Cases (4 Required)</label>
                  
                  <div className="space-y-3 max-h-[190px] overflow-y-auto premium-scroll pr-1">
                    {testCases.map((tc, tcIndex) => {
                      const isHidden = tcIndex >= 2;
                      return (
                        <div key={tcIndex} className={`p-3 rounded-xl border bg-black/40 space-y-2 text-xs ${
                          isHidden ? 'border-yellow-500/10' : 'border-white/5'
                        }`}>
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                            <span className={isHidden ? 'text-yellow-500/80' : 'text-slate-400'}>
                              {isHidden ? `🔒 Hidden Test Case #${tcIndex + 1}` : `👁️ Visible Test Case #${tcIndex + 1}`}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              placeholder="Input value"
                              value={tc.input}
                              onChange={(e) => {
                                const updated = [...testCases];
                                updated[tcIndex].input = e.target.value;
                                setTestCases(updated);
                              }}
                              className="h-8 px-2 bg-white/5 border border-white/5 rounded font-mono text-[10px] focus:outline-none text-white"
                            />
                            <input
                              placeholder="Expected Output"
                              value={tc.output}
                              onChange={(e) => {
                                const updated = [...testCases];
                                updated[tcIndex].output = e.target.value;
                                setTestCases(updated);
                              }}
                              className="h-8 px-2 bg-white/5 border border-white/5 rounded font-mono text-[10px] focus:outline-none text-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button 
                variant="outline" 
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="h-11 rounded-xl px-6 text-xs"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddChallenge}
                className="h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 shadow-lg shadow-purple-500/15"
              >
                Create Challenge
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
