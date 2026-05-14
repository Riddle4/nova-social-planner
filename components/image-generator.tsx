"use client";

import Link from "next/link";
import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PostImageGenerator({
  postId,
  initialPrompt
}: {
  postId: string;
  initialPrompt?: string | null;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/nova/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, prompt })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "La génération d'image a échoué.");
      setLoading(false);
      return;
    }
    router.refresh();
    window.location.reload();
  }

  return (
    <div className="mt-4 space-y-3">
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Décris l'image à générer pour ce post"
      />
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
      <Button type="button" variant="outline" className="w-full" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {loading ? "Génération..." : "Générer une image IA"}
      </Button>
    </div>
  );
}

export function MediaImageGenerator({
  services,
  events
}: {
  services: { id: string; name: string }[];
  events: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [eventId, setEventId] = useState("");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaTitle, setMediaTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setMediaUrl(null);
    setMediaTitle(null);
    const response = await fetch("/api/nova/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, title, serviceId, eventId })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "La génération d'image a échoué.");
      setLoading(false);
      return;
    }
    setMediaUrl(data.mediaAsset?.url || null);
    setMediaTitle(data.mediaAsset?.title || null);
    setPrompt("");
    setTitle("");
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4 rounded-md border border-violet-400/30 bg-violet-400/10 p-4">
      <div>
        <p className="font-medium text-white">Créer une image IA</p>
        <p className="mt-1 text-sm text-slate-400">
          L'image sera ajoutée à la banque média avec la source GENERATED. Le style par défaut est une illustration magique premium plutôt qu'une fausse photo.
        </p>
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        className="h-10 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        placeholder="Titre de l'image"
      />
      <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Prompt image IA" />
      <div className="grid gap-3 md:grid-cols-2">
        <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="h-10 rounded-md border border-slate-800 bg-slate-950/70 px-3 text-sm text-slate-100">
          <option value="">Aucun service</option>
          {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </select>
        <select value={eventId} onChange={(event) => setEventId(event.target.value)} className="h-10 rounded-md border border-slate-800 bg-slate-950/70 px-3 text-sm text-slate-100">
          <option value="">Aucun événement</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
        </select>
      </div>
      {error ? <p className="text-sm text-red-200">{error}</p> : null}
      {mediaUrl ? (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
          <img src={mediaUrl} alt={mediaTitle || "Image générée"} className="mb-3 aspect-square w-full rounded-md object-cover" />
          <p className="mb-3 text-sm text-cyan-100">Image ajoutée aux médias existants.</p>
          <Button asChild variant="outline">
            <Link href={mediaUrl} target="_blank">Ouvrir l'image</Link>
          </Button>
        </div>
      ) : null}
      <Button type="button" onClick={generate} disabled={loading || !prompt.trim()}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {loading ? "Génération..." : "Générer et ajouter au média"}
      </Button>
    </div>
  );
}
