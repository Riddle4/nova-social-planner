import Link from "next/link";
import { CalendarDays, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getDefaultCompany } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const company = await getDefaultCompany();
  const [posts, toValidate, events, recommendations] = await Promise.all([
    prisma.post.findMany({
      where: { companyId: company.id, status: { not: "ARCHIVED" } },
      orderBy: [{ recommendedDate: "asc" }, { createdAt: "desc" }],
      take: 5,
      include: { service: true, event: true, mediaAsset: true }
    }),
    prisma.post.count({ where: { companyId: company.id, status: "TO_VALIDATE" } }),
    prisma.event.findMany({
      where: { companyId: company.id, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 4
    }),
    prisma.novaRecommendation.findMany({
      where: { companyId: company.id, isArchived: false },
      orderBy: { createdAt: "desc" },
      take: 3
    })
  ]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-cyan-200">Cosmo AI / Nova</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Planification éditoriale de {company.name}
          </h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Centralisez services, événements, médias et posts prêts pour Meta Business Suite.
          </p>
        </div>
        <Button asChild>
          <Link href="/nova">
            <Wand2 className="h-4 w-4" />
            Générer stratégie du mois
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Posts actifs</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">{posts.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>À valider</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold text-amber-200">{toValidate}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Événements</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold text-cyan-200">{events.length}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Rythme</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-300">3 à 5 posts / semaine</CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader><CardTitle>Prochains posts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="block rounded-md border border-slate-800 p-4 hover:bg-slate-900/70">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{post.internalTitle}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {post.service?.name || post.event?.title || "Contenu éditorial"} · {post.platform}
                    </p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
              </Link>
            ))}
            {!posts.length ? <p className="text-sm text-slate-400">Aucun post pour le moment.</p> : null}
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Événements à venir</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-md border border-slate-800 p-3">
                  <CalendarDays className="h-4 w-4 text-cyan-200" />
                  <div>
                    <p className="text-sm font-medium text-white">{event.title}</p>
                    <p className="text-xs text-slate-400">{event.startsAt.toLocaleDateString("fr-CH")}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Recommandations Nova</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recommendations.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm text-slate-300">
                  <Sparkles className="h-4 w-4 text-violet-200" />
                  <span>{item.title}</span>
                </div>
              ))}
              {!recommendations.length ? (
                <div className="flex gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  <span>Lancez une stratégie dans Nova Studio pour remplir cette zone.</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
