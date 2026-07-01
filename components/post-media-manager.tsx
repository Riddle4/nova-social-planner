"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Loader2, Search, Trash2, Upload } from "lucide-react";
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
  eventTitle,
}: PostMediaManagerProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryMode, setGalleryMode] = useState<"recommended" | "all">(
    "recommended",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "context" | "upload" | "generated" | "uncategorized"
  >("all");
  const contextLabel = eventTitle || serviceName || "ce post";

  function isContextual(asset: PostMediaAsset) {
    const matchesEvent = eventId && asset.eventId === eventId;
    const matchesService = serviceId && asset.serviceId === serviceId;
    return Boolean(matchesEvent || matchesService);
  }

  const contextualMedia = useMemo(() => {
    const seen = new Set<string>();
    const matches = mediaAssets.filter((asset) => {
      if (!isContextual(asset)) return false;
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

  const visibleMedia = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const base = galleryMode === "recommended" ? contextualMedia : mediaAssets;

    return base.filter((asset) => {
      if (galleryMode === "all") {
        if (filter === "context" && !isContextual(asset)) return false;
        if (filter === "upload" && asset.source !== "UPLOAD") return false;
        if (filter === "generated" && asset.source !== "GENERATED")
          return false;
        if (filter === "uncategorized" && (asset.serviceId || asset.eventId))
          return false;
      }

      if (!normalizedSearch) return true;

      const haystack = [
        asset.title,
        asset.filename,
        asset.description,
        asset.source,
        ...asset.tags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [contextualMedia, filter, galleryMode, mediaAssets, search]);

  const emptyGalleryMessage =
    galleryMode === "recommended"
      ? "Aucun média n'est encore classé pour ce service ou cet événement. Passez sur toute la banque média ou uploadez une image externe ci-dessous."
      : "Aucune image ne correspond à cette recherche.";

  async function setPostMedia(mediaAssetId: string | null) {
    setBusyId(mediaAssetId || "remove");
    await fetch(`/api/posts/${postId}/media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaAssetId }),
    });
    window.location.reload();
  }

  async function uploadMedia(formData: FormData) {
    setUploading(true);
    await fetch(`/api/posts/${postId}/media`, {
      method: "POST",
      body: formData,
    });
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {currentMedia ? (
        <div className="space-y-2">
          <img
            src={currentMedia.url}
            alt={currentMedia.title || currentMedia.filename}
            className="rounded-md border border-slate-800"
          />
          <p className="text-xs text-slate-500">
            {currentMedia.title || currentMedia.filename}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-800 p-4 text-sm text-slate-400">
          Aucun média associé.
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setGalleryOpen((value) => !value)}
      >
        <ImagePlus className="h-4 w-4" />
        Choisir une image dans les médias
      </Button>

      {galleryOpen && (
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-3 space-y-3">
            <div>
              <p className="text-sm font-medium text-white">Choisir un média</p>
              <p className="text-xs text-slate-500">
                Les images recommandées restent prioritaires, mais vous pouvez
                ouvrir toute la banque média si besoin.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-900/70 p-1">
              <button
                type="button"
                onClick={() => setGalleryMode("recommended")}
                className={cn(
                  "rounded px-3 py-2 text-xs font-medium transition",
                  galleryMode === "recommended"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800",
                )}
              >
                Recommandées ({contextualMedia.length})
              </button>
              <button
                type="button"
                onClick={() => setGalleryMode("all")}
                className={cn(
                  "rounded px-3 py-2 text-xs font-medium transition",
                  galleryMode === "all"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800",
                )}
              >
                Toute la banque ({mediaAssets.length})
              </button>
            </div>
            {galleryMode === "all" ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Rechercher par titre, fichier, tag..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "Toutes"],
                    ["context", contextLabel],
                    ["upload", "Uploads"],
                    ["generated", "IA"],
                    ["uncategorized", "Non classées"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFilter(value as typeof filter)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        filter === value
                          ? "border-cyan-300 bg-cyan-400/15 text-cyan-100"
                          : "border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Images liées à {contextLabel}.
              </p>
            )}
          </div>
          {visibleMedia.length ? (
            <div className="grid max-h-[520px] gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-1">
              {visibleMedia.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setPostMedia(asset.id)}
                  disabled={Boolean(busyId)}
                  className={cn(
                    "group overflow-hidden rounded-md border border-slate-800 bg-slate-900/60 text-left transition hover:border-cyan-300/70",
                    currentMedia?.id === asset.id && "border-cyan-300",
                  )}
                >
                  <img
                    src={asset.url}
                    alt={asset.title || asset.filename}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="line-clamp-1 text-sm font-medium text-white">
                      {asset.title || asset.filename}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
                      <span>{asset.source}</span>
                      {isContextual(asset) ? (
                        <span className="text-cyan-200">recommandée</span>
                      ) : null}
                      {!asset.serviceId && !asset.eventId ? (
                        <span>non classée</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-slate-900 p-3 text-sm text-slate-400">
              {emptyGalleryMessage}
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => setUploadOpen((value) => !value)}
      >
        <Upload className="h-4 w-4" />
        Uploader une image externe
      </Button>

      {uploadOpen && (
        <form
          action={uploadMedia}
          className="grid gap-3 rounded-md border border-slate-800 p-3"
        >
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
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Ajouter et utiliser cette image
          </Button>
        </form>
      )}

      <Button
        type="button"
        variant="ghost"
        className="w-full text-amber-200"
        onClick={() => setPostMedia(null)}
        disabled={Boolean(busyId)}
      >
        {busyId === "remove" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        Supprimer l'image du post
      </Button>
    </div>
  );
}
