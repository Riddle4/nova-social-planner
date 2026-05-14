import Link from "next/link";
import { Plus } from "lucide-react";
import { createPost, getDefaultCompany } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";

export default async function PostsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const company = await getDefaultCompany();
  const where = {
    companyId: company.id,
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.platform ? { platform: params.platform as never } : {})
  };
  const [posts, services, events, media] = await Promise.all([
    prisma.post.findMany({ where, include: { service: true, event: true, mediaAsset: true, campaign: true }, orderBy: { createdAt: "desc" } }),
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    prisma.event.findMany({ where: { companyId: company.id }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-3xl font-semibold text-white">Posts</h1><p className="mt-2 text-slate-400">Tous les contenus générés ou préparés pour Meta.</p></div>
        <Button asChild variant="outline"><Link href="/calendar">Vue calendrier</Link></Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Créer un post</CardTitle></CardHeader>
        <CardContent>
          <form action={createPost} className="grid gap-4 lg:grid-cols-2">
            <div className="field"><label>Titre interne</label><Input name="internalTitle" required /></div>
            <div className="field"><label>Plateforme</label><Select name="platform"><option>BOTH</option><option>FACEBOOK</option><option>INSTAGRAM</option></Select></div>
            <div className="field"><label>Statut</label><Select name="status"><option>IDEA</option><option>AI_DRAFT</option><option>TO_VALIDATE</option><option>VALIDATED</option></Select></div>
            <div className="field"><label>Date recommandée</label><Input name="recommendedDate" type="date" /></div>
            <div className="field"><label>Heure recommandée</label><Input name="recommendedTime" placeholder="09:30" /></div>
            <div className="field"><label>Objectif</label><Input name="objective" /></div>
            <div className="field"><label>Angle marketing</label><Input name="marketingAngle" /></div>
            <div className="field"><label>Service</label><Select name="serviceId"><option value="">Aucun</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></div>
            <div className="field"><label>Événement</label><Select name="eventId"><option value="">Aucun</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</Select></div>
            <div className="field"><label>Image</label><Select name="mediaAssetId"><option value="">Aucune</option>{media.map((asset) => <option key={asset.id} value={asset.id}>{asset.title || asset.filename}</option>)}</Select></div>
            <div className="field lg:col-span-2"><label>Texte Facebook</label><Textarea name="facebookText" /></div>
            <div className="field lg:col-span-2"><label>Texte Instagram</label><Textarea name="instagramText" /></div>
            <div className="field"><label>Hashtags</label><Input name="hashtags" /></div>
            <div className="field"><label>CTA</label><Input name="callToAction" /></div>
            <div className="field"><label>Lien</label><Input name="link" /></div>
            <div className="field"><label>Prompt image générée</label><Input name="generatedImagePrompt" /></div>
            <Button className="lg:col-span-2"><Plus className="h-4 w-4" />Créer le post</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {posts.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 transition hover:bg-slate-900/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-medium text-white">{post.internalTitle}</p><p className="mt-1 text-sm text-slate-400">{post.platform} · {post.service?.name || post.event?.title || "éditorial"}</p></div>
              <StatusBadge status={post.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
