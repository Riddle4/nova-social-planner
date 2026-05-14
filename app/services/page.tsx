import Link from "next/link";
import { ArrowRight, Mail, Trash2 } from "lucide-react";
import { createService, deleteService, getDefaultCompany } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

export default async function ServicesPage() {
  const company = await getDefaultCompany();
  const services = await prisma.service.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Services</h1>
        <p className="mt-2 text-slate-400">Les offres que Nova peut promouvoir dans vos posts.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Ajouter un service</CardTitle></CardHeader>
        <CardContent>
          <form action={createService} className="grid gap-4 lg:grid-cols-2">
            <div className="field"><label>Nom</label><Input name="name" required /></div>
            <div className="field"><label>Description courte</label><Input name="shortDescription" required /></div>
            <div className="field lg:col-span-2"><label>Description longue</label><Textarea name="longDescription" /></div>
            <div className="field"><label>Cible</label><Input name="targetAudience" /></div>
            <div className="field"><label>Bénéfices</label><Input name="benefits" /></div>
            <div className="field"><label>Prix / tarifs</label><Input name="pricingInfo" /></div>
            <div className="field"><label>Lien de réservation</label><Input name="bookingUrl" /></div>
            <div className="field"><label>E-mail de réservation</label><Input name="bookingEmail" type="email" /></div>
            <div className="field"><label>Saisonnalité</label><Input name="seasonality" /></div>
            <div className="field"><label>Priorité commerciale</label><Select name="commercialPriority"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></Select></div>
            <div className="field"><label>Arguments de vente</label><Textarea name="salesArguments" /></div>
            <div className="field"><label>Objections fréquentes</label><Textarea name="frequentObjections" /></div>
            <Button className="lg:col-span-2">Créer le service</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <Card key={service.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div><CardTitle>{service.name}</CardTitle><p className="mt-1 text-sm text-slate-400">{service.shortDescription}</p></div>
              <form action={deleteService}><input type="hidden" name="id" value={service.id} /><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></form>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-300">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{service.commercialPriority}</span>
                {service.pricingInfo ? <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{service.pricingInfo}</span> : null}
                {service.bookingEmail ? <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2.5 py-1 text-xs text-cyan-100"><Mail className="h-3 w-3" />E-mail</span> : null}
              </div>
              {service.targetAudience ? <p>Cible: {service.targetAudience}</p> : null}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/services/${service.id}`}>
                  Modifier le service
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
