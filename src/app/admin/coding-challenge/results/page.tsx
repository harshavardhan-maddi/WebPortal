"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Save, Download } from "lucide-react";

// Lazy-load xlsx for Excel export
const exportToExcel = async (data: any[]) => {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  XLSX.writeFile(wb, "coding_challenge_results.xlsx");
};

interface ResultRow {
  rollNumber: string;
  submissions: number;
  timeTaken: string; // e.g., "00:02:15"
  tabSwitchCount: number;
  cameraOn: boolean;
  completedBy: string; // "Camera On" / "Camera Off"
}

export default function CodingChallengeResults() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const { data, error } = await supabase
        .from("coding_challenge_submissions")
        .select("roll_number, submissions, time_taken, tab_switches, camera_status")
        .order("roll_number", { ascending: true });
      if (error) {
        console.error("Error fetching results", error);
        setLoading(false);
        return;
      }
      const formatted = data.map((row: any) => ({
        rollNumber: row.roll_number,
        submissions: row.submissions,
        timeTaken: row.time_taken,
        tabSwitchCount: row.tab_switches,
        cameraOn: row.camera_status === "on",
        completedBy: row.camera_status === "on" ? "Camera On" : "Camera Off",
      }));
      setResults(formatted);
      setLoading(false);
    };
    fetchResults();
  }, []);

  const handleExport = () => {
    exportToExcel(results);
  };

  return (
    <div className="max-w-7xl mx-auto py-12 space-y-8">
      <h1 className="text-4xl font-black text-center text-purple-300">Coding Challenge Results</h1>
      <div className="flex justify-end">
        <Button onClick={handleExport} variant="ghost" className="bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500 hover:text-white">
          <Download className="w-4 h-4 mr-2" /> Export to Excel
        </Button>
      </div>
      <div className="overflow-x-auto glass p-6 rounded-2xl border border-white/5">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading results…</p>
        ) : (
          <table className="w-full table-auto">
            <thead className="bg-white/5">
              <tr>
                <th className="p-3 text-left text-sm font-bold uppercase text-muted-foreground">Roll #</th>
                <th className="p-3 text-left text-sm font-bold uppercase text-muted-foreground">Submissions</th>
                <th className="p-3 text-left text-sm font-bold uppercase text-muted-foreground">Time Taken</th>
                <th className="p-3 text-left text-sm font-bold uppercase text-muted-foreground">Tab Switches</th>
                <th className="p-3 text-left text-sm font-bold uppercase text-muted-foreground">Camera</th>
                <th className="p-3 text-left text-sm font-bold uppercase text-muted-foreground">Completed By</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white/5" : "bg-black/10"}>
                  <td className="p-3 text-sm text-slate-200">{row.rollNumber}</td>
                  <td className="p-3 text-sm text-slate-200">{row.submissions}</td>
                  <td className="p-3 text-sm text-slate-200">{row.timeTaken}</td>
                  <td className="p-3 text-sm text-slate-200">{row.tabSwitchCount}</td>
                  <td className={`p-3 text-sm ${row.cameraOn ? "text-emerald-400" : "text-rose-400"}`}> {row.cameraOn ? "On" : "Off"} </td>
                  <td className="p-3 text-sm text-slate-200">{row.completedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
