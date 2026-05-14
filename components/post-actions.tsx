"use client";

import { Check, Clipboard, Download, ExternalLink, ImagePlus, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      <Clipboard className="h-4 w-4" />
      {done ? "Copié" : label}
    </Button>
  );
}

export function PrepareMetaPanel({
  postId,
  text,
  mediaUrl
}: {
  postId: string;
  text: string;
  mediaUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  async function prepare() {
    await navigator.clipboard.writeText(text);
    await fetch(`/api/posts/${postId}/prepare-meta`, { method: "POST" });
    setDone(true);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <Button type="button" onClick={prepare}>
        <Send className="h-4 w-4" />
        Préparer pour Meta
      </Button>
      {open ? (
        <div className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-100">
            <Check className="h-4 w-4" />
            {done ? "Texte copié et export Meta enregistré" : "Préparation Meta"}
          </div>
          {mediaUrl ? (
            <div className="mb-4 space-y-3">
              <img src={mediaUrl} alt="" className="max-h-72 rounded-md border border-slate-800 object-cover" />
              <Button asChild variant="outline" size="sm">
                <a href={mediaUrl} download>
                  <Download className="h-4 w-4" />
                  Télécharger le média
                </a>
              </Button>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-300">
              <ImagePlus className="h-4 w-4" />
              Aucune image associée pour ce post.
            </div>
          )}
          <ol className="space-y-2 text-sm text-slate-200">
            {[
              "Ouvrir Meta Business Suite.",
              "Créer une nouvelle publication.",
              "Coller le texte copié.",
              "Ajouter l'image ou le média.",
              "Choisir la date et l'heure recommandées.",
              "Programmer la publication.",
              "Revenir dans Nova Social Planner et marquer le post comme programmé manuellement."
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span>{item}</span>
              </li>
            ))}
          </ol>
          <Button asChild variant="ghost" size="sm" className="mt-4">
            <a href="https://business.facebook.com/latest/composer" target="_blank">
              <ExternalLink className="h-4 w-4" />
              Meta Business Suite
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function StatusButton({ postId, status, label, redirectTo }: { postId: string; status: string; label: string; redirectTo?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        await fetch(`/api/posts/${postId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (redirectTo) {
          window.location.href = redirectTo;
        } else {
          window.location.reload();
        }
      }}
    >
      {label}
    </Button>
  );
}
