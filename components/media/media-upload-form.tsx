import type { Event, Service } from "@prisma/client";
import { uploadMedia } from "@/app/actions";
import { FileDropInput } from "@/components/media/file-drop-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function MediaUploadForm({
  services,
  events,
  defaultServiceId = "",
  defaultEventId = "",
  title = "Uploader une image"
}: {
  services: Service[];
  events: Event[];
  defaultServiceId?: string;
  defaultEventId?: string;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <form action={uploadMedia} className="grid gap-4 lg:grid-cols-2">
          <div className="field lg:col-span-2"><label>Image</label><FileDropInput required /></div>
          <div className="field"><label>Titre</label><Input name="title" /></div>
          <div className="field lg:col-span-2"><label>Description</label><Textarea name="description" /></div>
          <div className="field"><label>Tags</label><Input name="tags" placeholder="été, équipe, produit" /></div>
          <div className="field"><label>Service associé</label><Select name="serviceId" defaultValue={defaultServiceId}><option value="">Aucun</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></div>
          <div className="field"><label>Événement associé</label><Select name="eventId" defaultValue={defaultEventId}><option value="">Aucun</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</Select></div>
          <Button className="lg:col-span-2">Ajouter à la galerie</Button>
        </form>
      </CardContent>
    </Card>
  );
}
