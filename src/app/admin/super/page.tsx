"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Plus, 
  Upload, 
  FileSpreadsheet, 
  Clock, 
  ShieldCheck,
  ArrowRight,
  Download,
  Settings2,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};


export default function AdminControlCenter() {
  const [session, setSession] = React.useState<any>(null);
  const [isExporting, setIsExporting] = React.useState(false);


  React.useEffect(() => {
    const s = JSON.parse(localStorage.getItem("admin_session") || "{}");
    if (!s.role) {
      window.location.href = "/auth/login";
      return;
    }
    setSession(s);
  }, []);


  const downloadReport = async () => {
    setIsExporting(true);
    try {
      const { data: results, error } = await supabase
        .from('results')
        .select('*, quizzes(title, date)')
        .eq('batch', session?.batch || '3rd Year Super 50')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      if (!results || results.length === 0) {
        alert("No results found for the current batch.");
        setIsExporting(false);
        return;
      }

      const workbook = XLSX.utils.book_new();
      const domains = Array.from(new Set(results.map(r => r.domain || 'general')));

      domains.forEach(domain => {
        const domainData = results.filter(r => (r.domain || 'general') === domain);
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
        XLSX.utils.book_append_sheet(workbook, worksheet, domain.replace('-', ' ').toUpperCase().slice(0, 31));
      });

      const batchName = session?.batch || 'Consolidated';
      XLSX.writeFile(workbook, `${batchName}_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };



  const adminDomain = session?.domain || "all";
  const adminRole = session?.role || "super-admin";

  return (
    <div className="space-y-10 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold">Admin Control Center</h2>
          <p className="text-muted-foreground mt-1">
            {adminRole === "super-admin" ? "Total System Overview" : `Management for ${adminDomain.replace('-', ' ')}`}
          </p>
        </div>
      </div>

      {/* Main Action Modules */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Module 1: Question Bank & Generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-full"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary mb-6">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-3">Quiz Generation</h3>
          <p className="text-sm text-muted-foreground flex-1 mb-8">
            Generate new quizzes by uploading PDF question banks. Verify student solutions against extracted answer keys.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = "/admin/quizzes"}
              variant="glass"
              className="w-full justify-between group rounded-xl h-12"
            >
              Access Quiz Engine <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Module 2: Assignment & Conduct */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-full"
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-3">Conduct Quiz</h3>
          <p className="text-sm text-muted-foreground flex-1 mb-8">
            Schedule quizzes, set timers, and assign specific domains. Control when the quiz goes live and when it ends.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = "/admin/management"}
              className="w-full justify-between group rounded-xl h-12 bg-purple-600 hover:bg-purple-500"
            >
              Go to Management Hub <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Module 3: Reports & Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-full"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold mb-3">Report Center</h3>
          <p className="text-sm text-muted-foreground flex-1 mb-8">
            Download comprehensive student performance reports. All results are automatically synced with Google Sheets.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={downloadReport}
              disabled={isExporting}
              className="w-full justify-between group rounded-xl h-12 bg-orange-600 hover:bg-orange-500 shadow-lg shadow-orange-600/20"
            >
              {isExporting ? "Processing..." : "Download Excel Report"} 
              {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
            </Button>



            <Button variant="glass" className="w-full justify-between rounded-xl h-12">
              Sync Google Sheets <ShieldCheck className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>

    </div>
  );
}

