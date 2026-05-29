"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
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
    </div>
  );
}
