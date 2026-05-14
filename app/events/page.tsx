import Link from "next/link";
import { ArrowRight, CalendarDays, Trash2 } from "lucide-react";
import { createEvent, deleteEvent, getDefaultCompany } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

export default async function EventsPage() {
  const company = await getDefaultCompany();
  const events = await prisma.event.findMany({ where: { companyId: company.id }, orderBy: { startsAt: "asc" } });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold text-white">Événements</h1><p className="mt-2 text-slate-400">Dates à soutenir dans la stratégie éditoriale.</p></div>
      <Card>
        <CardHeader><CardTitle>Ajouter un événement</CardTitle></CardHeader>
        <CardContent>
          <form action={createEvent} className="grid gap-4 lg:grid-cols-2">
            <div className="field"><label>Titre</label><Input name="title" required /></div>
            <div className="field"><label>Lieu</label><Input name="location" /></div>
            <div className="field"><label>Date de début</label><Input name="startsAt" type="datetime-local" required /></div>
            <div className="field"><label>Date de fin</label><Input name="endsAt" type="datetime-local" /></div>
            <div className="field lg:col-span-2"><label>Description</label><Textarea name="description" /></div>
            <div className="field"><label>Public cible</label><Input name="targetAudience" /></div>
            <div className="field"><label>Lien de réservation</label><Input name="bookingUrl" /></div>
            <div className="field"><label>E-mail de réservation</label><Input name="bookingEmail" type="email" /></div>
            <div className="field"><label>Deadline inscription</label><Input name="registrationDeadline" type="datetime-local" /></div>
            <div className="field"><label>Priorité commerciale</label><Select name="commercialPriority"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></Select></div>
            <div className="field"><label>Objectif</label><Input name="objective" /></div>
            <div className="field"><label>Notes internes</label><Textarea name="internalNotes" /></div>
            <Button className="lg:col-span-2">Créer l’événement</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div><CardTitle>{event.title}</CardTitle><p className="mt-1 text-sm text-slate-400">{event.startsAt.toLocaleString("fr-CH")}</p></div>
              <form action={deleteEvent}><input type="hidden" name="id" value={event.id} /><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></form>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs"><CalendarDays className="h-3 w-3" />{event.startsAt.toLocaleDateString("fr-CH")}</span>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{event.commercialPriority}</span>
                {event.location ? <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{event.location}</span> : null}
              </div>
              {event.objective ? <p>Objectif: {event.objective}</p> : null}
              {event.description ? <p className="line-clamp-3">{event.description}</p> : null}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/events/${event.id}`}>
                  Modifier l’événement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
