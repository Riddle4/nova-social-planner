"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CalendarEmptyDayCreator({
  date,
  dayLabel
}: {
  date: string;
  dayLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [generateImage, setGenerateImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPost() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/nova/generate-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: subject, recommendedDate: date, generateImage })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Impossible de générer le post.");
      setLoading(false);
      return;
    }
    if (data.url) {
      router.push(data.url);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 bg-slate-950/40 px-2 py-3 text-xs text-slate-400 transition hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-100"
      >
        <Plus className="h-3.5 w-3.5" />
        Générer un post
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-2 text-left">
      <p className="text-[11px] font-medium uppercase tracking-wide text-cyan-100">{dayLabel}</p>
      <Input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="Sujet du post"
        className="h-8 text-xs"
      />
      <label className="flex items-center gap-2 text-[11px] text-slate-300">
        <input
          type="checkbox"
          checked={generateImage}
          onChange={(event) => setGenerateImage(event.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950"
        />
        Générer aussi une image IA
      </label>
      {error ? <p className="text-[11px] text-red-200">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-8 flex-1 text-xs" onClick={createPost} disabled={loading || !subject.trim()}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Créer
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setOpen(false)} disabled={loading}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
