import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { deleteEvent, updateEvent } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

function toDateTimeLocal(date?: Date | null) {
  if (!date) return "";
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/events"><ArrowLeft className="h-4 w-4" />Événements</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-semibold text-white">{event.title}</h1>
        <p className="mt-2 text-slate-400">Modifier les dates, le CTA et les informations utilisées par Nova.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Modifier l’événement</CardTitle></CardHeader>
        <CardContent>
          <form action={updateEvent} className="grid gap-4">
            <input type="hidden" name="id" value={event.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field"><label>Titre</label><Input name="title" defaultValue={event.title} required /></div>
              <div className="field"><label>Lieu</label><Input name="location" defaultValue={event.location || ""} /></div>
              <div className="field"><label>Date de début</label><Input name="startsAt" type="datetime-local" defaultValue={toDateTimeLocal(event.startsAt)} required /></div>
              <div className="field"><label>Date de fin</label><Input name="endsAt" type="datetime-local" defaultValue={toDateTimeLocal(event.endsAt)} /></div>
            </div>
            <div className="field"><label>Description</label><Textarea name="description" defaultValue={event.description || ""} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field"><label>Public cible</label><Input name="targetAudience" defaultValue={event.targetAudience || ""} /></div>
              <div className="field"><label>Lien de réservation</label><Input name="bookingUrl" defaultValue={event.bookingUrl || ""} /></div>
              <div className="field"><label>E-mail de réservation</label><Input name="bookingEmail" type="email" defaultValue={event.bookingEmail || ""} /></div>
              <div className="field"><label>Deadline inscription</label><Input name="registrationDeadline" type="datetime-local" defaultValue={toDateTimeLocal(event.registrationDeadline)} /></div>
            </div>
            <div className="field">
              <label>Priorité commerciale</label>
              <Select name="commercialPriority" defaultValue={event.commercialPriority}>
                <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field"><label>Objectif</label><Input name="objective" defaultValue={event.objective || ""} /></div>
              <div className="field"><label>Notes internes</label><Textarea name="internalNotes" defaultValue={event.internalNotes || ""} /></div>
            </div>
            <Button><Save className="h-4 w-4" />Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
      <form action={deleteEvent}>
        <input type="hidden" name="id" value={event.id} />
        <Button variant="ghost" className="text-red-200"><Trash2 className="h-4 w-4" />Supprimer l’événement</Button>
      </form>
    </div>
  );
}
