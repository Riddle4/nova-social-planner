"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PostRegenerator({
  postId,
  initialSubject
}: {
  postId: string;
  initialSubject: string;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(initialSubject);
  const [generateImage, setGenerateImage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setLoading(true);
    setError(null);
    const response = await fetch(`/api/posts/${postId}/regenerate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, generateImage })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "La régénération du post a échoué.");
      setLoading(false);
      return;
    }
    router.refresh();
    window.location.reload();
  }

  return (
    <div className="grid gap-3 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-4">
      <div>
        <p className="font-medium text-white">Régénérer ce post</p>
        <p className="mt-1 text-sm text-slate-400">
          Indique le sujet souhaité. Nova réécrit le texte et choisit une image adaptée, ou génère une nouvelle image IA.
        </p>
      </div>
      <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Sujet du post à régénérer" />
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={generateImage}
          onChange={(event) => setGenerateImage(event.target.checked)}
          className="h-4 w-4 rounded border-slate-700 bg-slate-950"
        />
        Générer une nouvelle image IA pour ce post
      </label>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
      <Button type="button" onClick={regenerate} disabled={loading || !subject.trim()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {loading ? "Régénération..." : "Régénérer le texte et l'image"}
      </Button>
    </div>
  );
}
