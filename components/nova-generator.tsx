"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MonthlyPostResult = {
  id: string;
  url: string;
  internalTitle: string;
  recommendedDate: string;
  mediaTitle?: string | null;
  generatedImagePrompt?: string | null;
  needsImage?: boolean;
};

export function NovaGenerator({
  initialStrategy,
  initialFeedback = "",
  initialStrategyId
}: {
  initialStrategy?: unknown;
  initialFeedback?: string;
  initialStrategyId?: string | null;
}) {
  const initialMonth =
    initialStrategy &&
    typeof initialStrategy === "object" &&
    "month" in initialStrategy &&
    typeof (initialStrategy as { month?: unknown }).month === "string"
      ? String((initialStrategy as { month: string }).month)
      : new Date().toISOString().slice(0, 7);
  const [strategy, setStrategy] = useState<unknown>(initialStrategy || null);
  const [strategyId, setStrategyId] = useState<string | null>(initialStrategyId || null);
  const [strategyFeedback, setStrategyFeedback] = useState(initialFeedback);
  const [brief, setBrief] = useState("");
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [month, setMonth] = useState(() => initialMonth);
  const [generateMissingImages, setGenerateMissingImages] = useState(false);
  const [monthlyPosts, setMonthlyPosts] = useState<MonthlyPostResult[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function generateStrategy() {
    setError(null);
    setLoading("strategy");
    const response = await fetch("/api/nova/month-strategy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, feedback: strategyFeedback })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "La génération de stratégie a échoué.");
      setLoading(null);
      return;
    }
    setStrategy(data.strategy);
    setStrategyId(data.strategyId || null);
    setLoading(null);
  }

  async function clearStrategy() {
    if (!strategyId) {
      setStrategy(null);
      setStrategyFeedback("");
      return;
    }
    setError(null);
    setLoading("clear-strategy");
    const response = await fetch("/api/nova/month-strategy", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: strategyId })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data.error || "Impossible d'effacer la stratégie.");
      setLoading(null);
      return;
    }
    setStrategy(null);
    setStrategyId(null);
    setStrategyFeedback("");
    setMonthlyPosts([]);
    setMonthlySummary(null);
    setLoading(null);
  }

  async function generatePost() {
    setError(null);
    setLoading("post");
    const body = new FormData();
    body.set("brief", brief);
    const response = await fetch("/api/nova/generate-post", { method: "POST", body });
    const data = await response.json();
    setPostUrl(data.url);
    setLoading(null);
  }

  async function generateMonth() {
    setError(null);
    setMonthlyPosts([]);
    setMonthlySummary(null);
    setLoading("month");
    const response = await fetch("/api/nova/generate-month", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, strategy, feedback: strategyFeedback, generateMissingImages })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "La génération mensuelle a échoué.");
      setLoading(null);
      return;
    }
    setMonthlyPosts(data.posts || []);
    setMonthlySummary(data.strategySummary || `${data.createdCount || 0} posts créés.`);
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
      <div className="rounded-md border border-slate-800 p-4">
        <p className="mb-3 font-medium text-white">1. Générer la stratégie de posts</p>
        <div className="mb-3 grid gap-3">
          <div className="field">
            <label>Mois à préparer</label>
            <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
          <textarea
            value={strategyFeedback}
            onChange={(event) => setStrategyFeedback(event.target.value)}
            className="min-h-24 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            placeholder="Consigne optionnelle: ex. mettre plus l'accent sur les anniversaires à domicile ce mois."
          />
        </div>
        <Button type="button" onClick={generateStrategy} disabled={loading === "strategy"}>
          <Wand2 className="h-4 w-4" />
          {loading === "strategy" ? "Génération..." : strategy ? "Régénérer la stratégie" : "Générer la stratégie de posts"}
        </Button>
        {strategy ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-cyan-400/30 bg-cyan-400/10 p-3">
              <p className="text-sm text-cyan-100">Stratégie sauvegardée. Tu peux changer de menu et revenir ici.</p>
              <Button type="button" variant="ghost" className="text-red-200 hover:bg-red-400/10" onClick={clearStrategy} disabled={loading === "clear-strategy"}>
                <Trash2 className="h-4 w-4" />
                {loading === "clear-strategy" ? "Effacement..." : "Effacer la stratégie"}
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-200">
              {JSON.stringify(strategy, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 rounded-md border border-cyan-400/30 bg-cyan-400/5 p-4">
        <div>
          <p className="font-medium text-white">2. Générer tous les posts du mois</p>
          <p className="mt-1 text-sm text-slate-400">
            Nova utilise la stratégie validée, écrit les textes avec CTA, choisit seulement des images non utilisées depuis deux mois, puis remplit le calendrier.
          </p>
        </div>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={generateMissingImages}
            onChange={(event) => setGenerateMissingImages(event.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950"
          />
          Générer automatiquement une image IA quand aucun média récent n’est disponible
        </label>
        <Button type="button" onClick={generateMonth} disabled={loading === "month" || !strategy}>
          <CalendarPlus className="h-4 w-4" />
          {loading === "month" ? "Création du calendrier..." : "Générer tous les posts du mois validé"}
        </Button>
        {!strategy ? <p className="text-sm text-amber-200">Générez et validez d’abord une stratégie.</p> : null}
        {monthlySummary ? <p className="text-sm text-cyan-100">{monthlySummary}</p> : null}
        {monthlyPosts.length ? (
          <div className="space-y-2">
            {monthlyPosts.map((post) => (
              <Link
                key={post.id}
                href={post.url}
                className="block rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm transition hover:bg-slate-900"
              >
                <span className="block font-medium text-white">{post.internalTitle}</span>
                <span className="mt-1 block text-slate-400">
                  {new Date(post.recommendedDate).toLocaleDateString("fr-CH")} ·{" "}
                  {post.mediaTitle ? `Image: ${post.mediaTitle}` : "Sans image récente: à traiter dans la fiche post"}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-md border border-slate-800 p-4">
        <p className="font-medium text-white">Post complet</p>
        <Input value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="Ex: promouvoir le service le plus prioritaire cette semaine" />
        <Button type="button" onClick={generatePost} disabled={loading === "post"}>
          {loading === "post" ? "Génération..." : "Générer un post"}
        </Button>
        {postUrl ? (
          <Button asChild variant="outline">
            <Link href={postUrl}>Ouvrir le post généré</Link>
          </Button>
        ) : null}
      </div>
      <div className="rounded-md border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-slate-300">
        Campagnes, idées de posts et génération d’images sont structurées pour l’étape suivante.
      </div>
    </div>
  );
}
