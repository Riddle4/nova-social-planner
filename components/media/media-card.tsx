import { Save, Trash2 } from "lucide-react";
import type { Event, MediaAsset, Service } from "@prisma/client";
import { deleteMedia, updateMedia } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function MediaCard({ asset, services, events }: { asset: MediaAsset; services: Service[]; events: Event[] }) {
  return (
    <Card className="overflow-hidden">
      <img src={asset.url} alt={asset.title || asset.filename} className="aspect-square w-full object-cover" />
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{asset.title || asset.filename}</p>
            <p className="mt-1 text-xs text-slate-400">{asset.source} · utilisé {asset.usageCount} fois</p>
          </div>
          <form action={deleteMedia}>
            <input type="hidden" name="id" value={asset.id} />
            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
          </form>
        </div>
        <div className="my-3 flex flex-wrap gap-2">
          {asset.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{tag}</span>)}
        </div>
        <details className="rounded-md border border-slate-800 bg-slate-950/50">
          <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-300">Modifier</summary>
          <form action={updateMedia} className="grid gap-3 p-3 pt-1">
            <input type="hidden" name="id" value={asset.id} />
            <div className="field"><label>Titre</label><Input name="title" defaultValue={asset.title || ""} /></div>
            <div className="field"><label>Description</label><Textarea name="description" defaultValue={asset.description || ""} /></div>
            <div className="field"><label>Tags</label><Input name="tags" defaultValue={asset.tags.join(", ")} /></div>
            <div className="field"><label>Service associé</label><Select name="serviceId" defaultValue={asset.serviceId || ""}><option value="">Aucun</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></div>
            <div className="field"><label>Événement associé</label><Select name="eventId" defaultValue={asset.eventId || ""}><option value="">Aucun</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</Select></div>
            <Button variant="outline" size="sm"><Save className="h-4 w-4" />Enregistrer</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
