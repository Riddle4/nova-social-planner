"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { FileDropInput } from "@/components/media/file-drop-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PostMediaAsset = {
  id: string;
  url: string;
  filename: string;
  title: string | null;
  description: string | null;
  source: string;
  tags: string[];
  serviceId: string | null;
  eventId: string | null;
};

type PostMediaManagerProps = {
  postId: string;
  currentMedia: PostMediaAsset | null;
  mediaAssets: PostMediaAsset[];
  serviceId: string | null;
  serviceName: string | null;
  eventId: string | null;
  eventTitle: string | null;
};

export function PostMediaManager({
  postId,
  currentMedia,
  mediaAssets,
  serviceId,
  serviceName,
  eventId,
  eventTitle
}: PostMediaManagerProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const contextLabel = eventTitle || serviceName || "ce post";

  const contextualMedia = useMemo(() => {
    const seen = new Set<string>();
    const matches = mediaAssets.filter((asset) => {
      const matchesEvent = eventId && asset.eventId === eventId;
      const matchesService = serviceId && asset.serviceId === serviceId;
      if (!matchesEvent && !matchesService) return false;
      if (seen.has(asset.id)) return false;
      seen.add(asset.id);
      return true;
    });

    return matches.sort((a, b) => {
      if (eventId && a.eventId === eventId && b.eventId !== eventId) return -1;
      if (eventId && b.eventId === eventId && a.eventId !== eventId) return 1;
      if (a.source === "UPLOAD" && b.source !== "UPLOAD") return -1;
      if (b.source === "UPLOAD" && a.source !== "UPLOAD") return 1;
      return 0;
    });
  }, [eventId, mediaAssets, serviceId]);

  async function setPostMedia(mediaAssetId: string | null) {
    setBusyId(mediaAssetId || "remove");
    await fetch(`/api/posts/${postId}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaAssetId })
    });
    window.location.reload();
  }

  async function uploadMedia(formData: FormData) {
    setUploading(true);
    await fetch(`/api/posts/${postId}/media`, {
      method: "POST",
      body: formData
    });
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {currentMedia ? (
        <div className="space-y-2">
          <img src={currentMedia.url} alt={currentMedia.title || currentMedia.filename} className="rounded-md border border-slate-800" />
          <p className="text-xs text-slate-500">{currentMedia.title || currentMedia.filename}</p>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-800 p-4 text-sm text-slate-400">Aucun média associé.</p>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={() => setGalleryOpen((value) => !value)}>
        <ImagePlus className="h-4 w-4" />
        Choisir une image dans les médias
      </Button>

      {galleryOpen && (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">Images pour {contextLabel}</p>
            <p className="text-xs text-slate-500">La galerie affiche seulement les médias liés au service ou à l'événement du post.</p>
          </div>
          {contextualMedia.length ? (
            <div className="grid max-h-[520px] gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-1">
              {contextualMedia.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setPostMedia(asset.id)}
                  disabled={Boolean(busyId)}
                  className={cn(
                    "group overflow-hidden rounded-md border border-slate-800 bg-slate-900/60 text-left transition hover:border-cyan-300/70",
                    currentMedia?.id === asset.id && "border-cyan-300"
                  )}
                >
                  <img src={asset.url} alt={asset.title || asset.filename} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-2">
                    <p className="line-clamp-1 text-sm font-medium text-white">{asset.title || asset.filename}</p>
                    <p className="mt-1 text-xs text-slate-500">{asset.source}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-slate-900 p-3 text-sm text-slate-400">
              Aucun média n'est encore classé pour ce service ou cet événement. Uploadez une image externe ci-dessous pour l'ajouter automatiquement à cette catégorie.
            </p>
          )}
        </div>
      )}

      <Button type="button" variant="outline" className="w-full" onClick={() => setUploadOpen((value) => !value)}>
        <Upload className="h-4 w-4" />
        Uploader une image externe
      </Button>

      {uploadOpen && (
        <form action={uploadMedia} className="grid gap-3 rounded-md border border-slate-800 p-3">
          <div className="field">
            <label>Image</label>
            <FileDropInput required />
          </div>
          <div className="field">
            <label>Titre</label>
            <Input name="title" placeholder={contextLabel} />
          </div>
          <div className="field">
            <label>Description</label>
            <Textarea name="description" />
          </div>
          <div className="field">
            <label>Tags</label>
            <Input name="tags" placeholder="post, campagne, visuel" />
          </div>
          <Button disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Ajouter et utiliser cette image
          </Button>
        </form>
      )}

      <Button type="button" variant="ghost" className="w-full text-amber-200" onClick={() => setPostMedia(null)} disabled={Boolean(busyId)}>
        {busyId === "remove" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Supprimer l'image du post
      </Button>
    </div>
  );
}
