import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { deleteService, updateService } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/services"><ArrowLeft className="h-4 w-4" />Services</Link>
      </Button>
      <div>
        <h1 className="text-3xl font-semibold text-white">{service.name}</h1>
        <p className="mt-2 text-slate-400">Modifier les informations utilisées par Nova pour les CTA et les contenus.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Modifier le service</CardTitle></CardHeader>
        <CardContent>
          <form action={updateService} className="grid gap-4">
            <input type="hidden" name="id" value={service.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field"><label>Nom</label><Input name="name" defaultValue={service.name} required /></div>
              <div className="field"><label>Description courte</label><Input name="shortDescription" defaultValue={service.shortDescription} required /></div>
            </div>
            <div className="field"><label>Description longue</label><Textarea name="longDescription" defaultValue={service.longDescription || ""} /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field"><label>Cible</label><Input name="targetAudience" defaultValue={service.targetAudience || ""} /></div>
              <div className="field"><label>Bénéfices</label><Input name="benefits" defaultValue={service.benefits || ""} /></div>
              <div className="field"><label>Prix / tarifs</label><Input name="pricingInfo" defaultValue={service.pricingInfo || ""} /></div>
              <div className="field"><label>Lien de réservation</label><Input name="bookingUrl" defaultValue={service.bookingUrl || ""} /></div>
              <div className="field"><label>E-mail de réservation</label><Input name="bookingEmail" type="email" defaultValue={service.bookingEmail || ""} /></div>
              <div className="field"><label>Saisonnalité</label><Input name="seasonality" defaultValue={service.seasonality || ""} /></div>
            </div>
            <div className="field">
              <label>Priorité commerciale</label>
              <Select name="commercialPriority" defaultValue={service.commercialPriority}>
                <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field"><label>Arguments de vente</label><Textarea name="salesArguments" defaultValue={service.salesArguments || ""} /></div>
              <div className="field"><label>Objections fréquentes</label><Textarea name="frequentObjections" defaultValue={service.frequentObjections || ""} /></div>
            </div>
            <Button><Save className="h-4 w-4" />Enregistrer</Button>
          </form>
        </CardContent>
      </Card>
      <form action={deleteService}>
        <input type="hidden" name="id" value={service.id} />
        <Button variant="ghost" className="text-red-200"><Trash2 className="h-4 w-4" />Supprimer le service</Button>
      </form>
    </div>
  );
}
