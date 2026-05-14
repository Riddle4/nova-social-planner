"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type ScheduleResult = {
  month: string;
  attempted: number;
  scheduled: number;
  failed: number;
  error?: string;
  issues?: string[];
  results?: {
    id: string;
    title: string;
    ok: boolean;
    error?: string;
  }[];
};

export function ScheduleMonthButton({ month }: { month: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);

  async function scheduleMonth() {
    if (!window.confirm("Programmer automatiquement tous les posts éligibles du mois dans Meta ?")) return;
    setLoading(true);
    setResult(null);
    const response = await fetch("/api/meta/schedule-month", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month })
    });
    const data = await response.json();
    setResult(data);
    setLoading(false);
    if (response.ok && data.failed === 0) {
      window.location.reload();
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={scheduleMonth} disabled={loading} className="w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Programmer le mois dans Meta
      </Button>
      {result ? (
        <div className="max-w-3xl rounded-md border border-slate-800 bg-slate-950/70 p-4 text-sm">
          {result.error ? <p className="font-medium text-red-200">{result.error}</p> : <p className="font-medium text-cyan-100">{result.scheduled} post(s) programmé(s), {result.failed} erreur(s).</p>}
          {result.issues?.length ? (
            <ul className="mt-2 list-inside list-disc text-slate-300">
              {result.issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          ) : null}
          {result.results?.length ? (
            <div className="mt-3 space-y-1 text-slate-300">
              {result.results.map((item) => (
                <p key={item.id} className={item.ok ? "text-emerald-200" : "text-red-200"}>
                  {item.ok ? "Programmé" : "Erreur"} · {item.title}{item.error ? ` · ${item.error}` : ""}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
