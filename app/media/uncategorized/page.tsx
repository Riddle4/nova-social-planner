import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDefaultCompany } from "@/app/actions";
import { MediaCard } from "@/components/media/media-card";
import { MediaUploadForm } from "@/components/media/media-upload-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function UncategorizedMediaPage() {
  const company = await getDefaultCompany();
  const [services, events, media] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    prisma.event.findMany({ where: { companyId: company.id }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id, serviceId: null, eventId: null }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/media">
          <ArrowLeft className="h-4 w-4" />
          Retour aux médias
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-semibold text-white">Images non classées</h1>
        <p className="mt-2 text-slate-400">Associez ces images à un service ou un événement pour les rendre plus faciles à retrouver.</p>
      </div>

      <MediaUploadForm services={services} events={events} title="Ajouter une image non classée" />

      {media.length ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {media.map((asset) => <MediaCard key={asset.id} asset={asset} services={services} events={events} />)}
        </div>
      ) : (
        <p className="rounded-md border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">Toutes les images sont déjà classées.</p>
      )}
    </div>
  );
}
