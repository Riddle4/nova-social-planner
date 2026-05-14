import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, FolderOpen, Images } from "lucide-react";
import { MediaImageGenerator } from "@/components/image-generator";
import { MediaUploadForm } from "@/components/media/media-upload-form";
import { Card, CardContent } from "@/components/ui/card";
import { getDefaultCompany } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export default async function MediaPage() {
  const company = await getDefaultCompany();
  const [services, events, media] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    prisma.event.findMany({ where: { companyId: company.id }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } })
  ]);
  const uncategorizedCount = media.filter((asset) => !asset.serviceId && !asset.eventId).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Banque média</h1>
        <p className="mt-2 text-slate-400">Organisez les images par service ou par événement pour que Nova choisisse les bons visuels.</p>
      </div>

      <MediaUploadForm services={services} events={events} />

      <MediaImageGenerator
        services={services.map((service) => ({ id: service.id, name: service.name }))}
        events={events.map((event) => ({ id: event.id, title: event.title }))}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-cyan-200" />
          <h2 className="text-xl font-semibold text-white">Services</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const assets = media.filter((asset) => asset.serviceId === service.id);
            return (
              <MediaFolder
                key={service.id}
                href={`/media/services/${service.id}`}
                icon={<FolderOpen className="h-5 w-5 text-cyan-200" />}
                title={service.name}
                subtitle={service.shortDescription || "Images liées à ce service"}
                count={assets.length}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-violet-200" />
          <h2 className="text-xl font-semibold text-white">Événements</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => {
            const assets = media.filter((asset) => asset.eventId === event.id);
            return (
              <MediaFolder
                key={event.id}
                href={`/media/events/${event.id}`}
                icon={<CalendarDays className="h-5 w-5 text-violet-200" />}
                title={event.title}
                subtitle={event.startsAt.toLocaleDateString("fr-CH")}
                count={assets.length}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-amber-200" />
          <h2 className="text-xl font-semibold text-white">À classer</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MediaFolder
            href="/media/uncategorized"
            icon={<Images className="h-5 w-5 text-amber-200" />}
            title="Images non classées"
            subtitle="À associer à un service ou un événement"
            count={uncategorizedCount}
          />
        </div>
      </section>
    </div>
  );
}

function MediaFolder({
  href,
  icon,
  title,
  subtitle,
  count
}: {
  href: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition group-hover:border-cyan-300/60 group-hover:bg-slate-900/80">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                {icon}
                <p className="font-medium text-white">{title}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-slate-400">{subtitle}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">{count}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
