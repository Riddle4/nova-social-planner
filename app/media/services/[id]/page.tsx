import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDefaultCompany } from "@/app/actions";
import { MediaCard } from "@/components/media/media-card";
import { MediaUploadForm } from "@/components/media/media-upload-form";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function ServiceMediaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getDefaultCompany();
  const [service, services, events, media] = await Promise.all([
    prisma.service.findFirst({ where: { id, companyId: company.id } }),
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    prisma.event.findMany({ where: { companyId: company.id }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id, serviceId: id }, orderBy: { createdAt: "desc" } })
  ]);
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href="/media">
          <ArrowLeft className="h-4 w-4" />
          Retour aux médias
        </Link>
      </Button>
      <div>
        <h1 className="text-3xl font-semibold text-white">{service.name}</h1>
        <p className="mt-2 text-slate-400">{media.length} image{media.length > 1 ? "s" : ""} liée{media.length > 1 ? "s" : ""} à ce service.</p>
      </div>

      <MediaUploadForm services={services} events={events} defaultServiceId={service.id} title="Ajouter une image à ce service" />

      {media.length ? (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
          {media.map((asset) => <MediaCard key={asset.id} asset={asset} services={services} events={events} />)}
        </div>
      ) : (
        <p className="rounded-md border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-400">Aucune image n'est encore classée dans ce service.</p>
      )}
    </div>
  );
}
