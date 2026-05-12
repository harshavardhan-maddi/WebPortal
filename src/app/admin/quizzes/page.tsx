"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  Plus, 
  FileText,
  AlertCircle,
  ChevronLeft,
  Timer,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

// Load PDF.js from CDN
const PDF_JS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
const PDF_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

export default function QuizCreationPage() {
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [quizData, setQuizData] = useState({
    title: "",
    domain: "cyber-security",
    domains: [] as string[], 
    isAllDomains: false,     
    batch: "3rd Year Super 50", // New state for batch
    date: "",

    time: "",
    endTime: "",
    file: null as File | null,
  });

  const [questions, setQuestions] = useState<any[]>([]);
  const [source, setSource] = useState<"pdf" | "manual" | null>(null);


  const [adminSession, setAdminSession] = useState<any>(null);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (!session.role) {
      window.location.href = "/auth/login";
      return;
    }
    setAdminSession(session);
    
    const initialBatch = session.role === "super-admin" ? "3rd Year Super 50" : (session.batch || "3rd Year Super 50");
    
    if (session.role === "domain-admin") {
      setQuizData(prev => ({ 
        ...prev, 
        domain: session.domain, 
        domains: [session.domain],
        batch: initialBatch 
      }));
    } else {
      setQuizData(prev => ({ 
        ...prev, 
        batch: initialBatch,
        domains: ["cyber-security"] 
      }));
    }
  }, []);


  const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;

  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const parsePDFWithGroq = async (text: string) => {
    if (!text || text.trim().length < 10) {
      throw new Error("No readable text found in PDF. Please ensure it is a text-based document.");
    }

    const processedText = text.substring(0, 30000);

    const prompt = `
      You are an expert Quiz Generator. 
      Analyze the following text extracted from a PDF and extract ALL multiple-choice questions.
      
      CRITICAL: Return ONLY a raw JSON array of objects. No markdown formatting, no "here is your JSON", no code blocks.
      
      Format:
      [
        {
          "text": "The full question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]

      Text:
      ${processedText}
    `;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a specialized JSON generator. Output only raw JSON arrays." },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          stream: false
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`Groq AI Error: ${data.error.message}`);
      }

      const rawOutput = data.choices[0].message.content.trim();
      const startIndex = rawOutput.indexOf('[');
      const endIndex = rawOutput.lastIndexOf(']') + 1;
      
      if (startIndex === -1 || endIndex === 0) {
        throw new Error("Failed to extract valid JSON from AI response.");
      }

      const cleanJson = rawOutput.substring(startIndex, endIndex);
      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      throw error;
    }
  };

  const processFile = async (file: File) => {
    try {
      if (!(window as any).pdfjsLib) {
        await loadScript(PDF_JS_URL);
      }
      
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n";
      }

      return parsePDFWithGroq(fullText);
    } catch (error: any) {
      console.error("PDF Read Error:", error);
      throw new Error(`Failed to read PDF file: ${error.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setQuizData({ ...quizData, file: e.target.files[0] });
    }
  };

  const nextStep = () => {
    if (step === 1 && (!quizData.title || !quizData.date || !quizData.time || !quizData.endTime)) {
      alert("Please fill in all quiz details including start and end times.");
      return;
    }
    setStep(step + 1);
  };

  const addManualQuestion = () => {
    setQuestions([...questions, {
      text: "",
      options: ["", "", "", ""],
      correctAnswer: 0
    }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "option") {
      updated[index].options[value.optIndex] = value.text;
    } else {
      updated[index][field] = value;
    }
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => setQuestions(questions.filter((_, i) => i !== index));

  const handleAIProcess = async () => {
    if (!quizData.file) return;
    setIsUploading(true);
    try {
      const extractedQuestions = await processFile(quizData.file);
      setQuestions(extractedQuestions);
      setStep(3);
    } catch (error: any) {
      alert(`AI Extraction failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalSave = async () => {
    if (questions.length === 0) {
      alert("Please add at least one question.");
      return;
    }

    setIsUploading(true);
    try {
      const targetDomains = quizData.batch === "4th Year Super 50" ? ["all"] : (quizData.isAllDomains ? ["all"] : quizData.domains);
      const inserts = targetDomains.map(dom => ({
        title: quizData.title,
        domain: dom,
        batch: quizData.batch,
        date: quizData.date,
        time: quizData.time,
        end_time: quizData.endTime,
        questions: questions
      }));

      const { error } = await supabase.from('quizzes').insert(inserts);
      if (error) throw error;
      setStep(4);
    } catch (error: any) {
      alert(`Save failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => window.location.href = "/admin/super"} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="text-4xl font-black tracking-tight">Quiz Engine</h1>
      </div>

      <div className="flex items-center justify-between mb-12 px-6">
        {[1, 2, 3, 4].map((num) => (
          <div key={num} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${step >= num ? 'bg-primary text-white' : 'bg-white/5 text-muted-foreground'}`}>{num < step ? <CheckCircle2 className="w-5 h-5" /> : num}</div>
            {num < 4 && <div className={`h-1 w-16 rounded-full ${step > num ? 'bg-primary' : 'bg-white/5'}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-10 rounded-[3rem] border border-white/5 space-y-8">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Target Batch</Label>
                {adminSession?.role === "super-admin" ? (
                  <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    {["3rd Year Super 50", "4th Year Super 50"].map((b) => (
                      <button
                        key={b}
                        onClick={() => setQuizData({...quizData, batch: b})}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                          quizData.batch === b ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-primary">
                    {quizData.batch}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quiz Title</Label>
                <Input placeholder="e.g. Mid-term Assessment" value={quizData.title} onChange={(e) => setQuizData({...quizData, title: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Execution Date</Label>
                <Input type="date" value={quizData.date} onChange={(e) => setQuizData({...quizData, date: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-2xl" />
              </div>
              
              <div className="space-y-2">
                <Label>Assigned Domains</Label>
                {quizData.batch === "3rd Year Super 50" ? (
                  adminSession?.role === "domain-admin" ? (
                    <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-primary capitalize">
                      {quizData.domain.replace('-', ' ')}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/40 transition-all cursor-pointer" onClick={() => setQuizData({...quizData, isAllDomains: !quizData.isAllDomains})}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${quizData.isAllDomains ? 'bg-primary border-primary' : 'border-white/20'}`}>
                          {quizData.isAllDomains && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-bold text-sm">All Domains</span>
                      </div>
                      
                      {!quizData.isAllDomains && (
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: "cyber-security", name: "Cyber" },
                            { id: "fsd", name: "FSD" },
                            { id: "aiml", name: "AI/ML" },
                            { id: "data-science", name: "Data" },
                          ].map((dom) => (
                            <div 
                              key={dom.id}
                              onClick={() => {
                                const newDomains = quizData.domains.includes(dom.id)
                                  ? quizData.domains.filter(d => d !== dom.id)
                                  : [...quizData.domains, dom.id];
                                setQuizData({...quizData, domains: newDomains});
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                quizData.domains.includes(dom.id) ? 'bg-primary/10 border-primary text-primary' : 'bg-white/5 border-white/10 text-muted-foreground'
                              }`}
                            >
                              <span className="text-xs font-bold">{dom.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="h-14 px-6 flex items-center bg-white/5 border border-white/10 rounded-2xl font-bold text-muted-foreground italic">
                    General Access
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Starting Time</Label>
                <Input type="time" value={quizData.time} onChange={(e) => setQuizData({...quizData, time: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Closing Time</Label>
                <Input type="time" value={quizData.endTime} onChange={(e) => setQuizData({...quizData, endTime: e.target.value})} className="h-14 bg-white/5 border-white/10 rounded-2xl border-red-500/20" />
              </div>
            </div>

            <Button onClick={nextStep} className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20">
              Continue to Questions <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        )}


        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setSource("pdf")} className={`p-8 rounded-[2.5rem] border transition-all ${source === "pdf" ? 'bg-primary/10 border-primary' : 'bg-white/5 border-white/10'}`}>
                <FileUp className="w-8 h-8 mb-4" />
                <h3 className="font-bold">AI PDF Extraction</h3>
              </button>
              <button onClick={() => { setSource("manual"); setQuestions([{ text: "", options: ["", "", "", ""], correctAnswer: 0 }]); setStep(3); }} className="p-8 rounded-[2.5rem] border border-white/10 bg-white/5">
                <Plus className="w-8 h-8 mb-4" />
                <h3 className="font-bold">Manual Entry</h3>
              </button>
            </div>
            {source === "pdf" && (
              <div className="glass p-10 rounded-[3rem] text-center border-dashed border-2 border-white/10">
                <input type="file" onChange={(e) => e.target.files && setQuizData({...quizData, file: e.target.files[0]})} />
                {quizData.file && <Button onClick={handleAIProcess} disabled={isUploading}>{isUploading ? "Processing..." : "Extract"}</Button>}
              </div>
            )}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="glass p-8 rounded-[2rem] border border-white/5 space-y-4">
                <textarea value={q.text} onChange={(e) => updateQuestion(qIndex, "text", e.target.value)} className="w-full bg-white/5 p-4 rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                  {q.options.map((opt: string, oIndex: number) => (
                    <div key={oIndex} className="flex gap-2">
                      <Input value={opt} onChange={(e) => updateQuestion(qIndex, "option", { optIndex: oIndex, text: e.target.value })} />
                      <button onClick={() => updateQuestion(qIndex, "correctAnswer", oIndex)} className={q.correctAnswer === oIndex ? "text-primary" : ""}>✓</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => removeQuestion(qIndex)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <Button onClick={addManualQuestion} variant="glass" className="w-full"><Plus className="mr-2" /> Add Question</Button>
            <Button onClick={handleFinalSave} disabled={isUploading} className="w-full h-14 rounded-2xl">{isUploading ? "Saving..." : "Deploy Quiz"}</Button>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20">
            <CheckCircle2 className="w-24 h-24 text-primary mx-auto mb-6" />
            <h2 className="text-4xl font-black">Quiz Deployed!</h2>
            <Button onClick={() => window.location.href = "/admin/management"} className="mt-8">Management Hub</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
