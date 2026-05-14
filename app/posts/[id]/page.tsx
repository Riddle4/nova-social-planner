import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { deletePost, updatePost } from "@/app/actions";
import { PostImageGenerator } from "@/components/image-generator";
import { CopyButton, PrepareMetaPanel, StatusButton } from "@/components/post-actions";
import { PostMediaManager } from "@/components/post-media-manager";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";

function toDateInput(date?: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

function calendarHref(date?: Date | null) {
  const month = date ? date.toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7);
  return `/calendar?month=${month}`;
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, include: { service: true, event: true, mediaAsset: true } });
  if (!post) notFound();
  const [services, events, mediaAssets] = await Promise.all([
    prisma.service.findMany({ where: { companyId: post.companyId }, orderBy: { name: "asc" } }),
    prisma.event.findMany({ where: { companyId: post.companyId }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: post.companyId }, orderBy: { createdAt: "desc" } })
  ]);
  const facebook = post.facebookText || "";
  const instagram = post.instagramText || "";
  const metaText = post.platform === "INSTAGRAM" ? instagram : facebook || instagram;
  const calendarUrl = calendarHref(post.recommendedDate);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <Link href={calendarHref(post.recommendedDate)}>
          <ArrowLeft className="h-4 w-4" />
          Retour au calendrier
        </Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">{post.internalTitle}</h1>
          <p className="mt-2 text-slate-400">{post.platform} · {post.recommendedDate?.toLocaleDateString("fr-CH") || "date à définir"} {post.recommendedTime || ""}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {post.service ? <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-cyan-100">Service: {post.service.name}</span> : null}
            {post.event ? <span className="rounded-full border border-violet-400/40 bg-violet-400/10 px-3 py-1 text-violet-100">Événement: {post.event.title}</span> : null}
            {!post.service && !post.event ? <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-amber-100">Aucun service ou événement associé</span> : null}
          </div>
        </div>
        <StatusBadge status={post.status} />
      </div>
      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Contenu prêt à publier</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <form action={updatePost} className="grid gap-4 rounded-md border border-slate-800 p-4">
              <input type="hidden" name="id" value={post.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field"><label>Titre interne</label><Input name="internalTitle" defaultValue={post.internalTitle} /></div>
                <div className="field"><label>Plateforme</label><Select name="platform" defaultValue={post.platform}><option>BOTH</option><option>FACEBOOK</option><option>INSTAGRAM</option></Select></div>
                <div className="field"><label>Statut</label><Select name="status" defaultValue={post.status}><option>IDEA</option><option>AI_DRAFT</option><option>TO_VALIDATE</option><option>VALIDATED</option><option>READY_FOR_META</option><option>MANUALLY_SCHEDULED</option><option>PUBLISHED</option><option>ARCHIVED</option></Select></div>
                <div className="field"><label>Date recommandée</label><Input type="date" name="recommendedDate" defaultValue={toDateInput(post.recommendedDate)} /></div>
                <div className="field"><label>Heure recommandée</label><Input name="recommendedTime" defaultValue={post.recommendedTime || ""} /></div>
                <div className="field"><label>Objectif</label><Input name="objective" defaultValue={post.objective || ""} /></div>
                <div className="field"><label>Angle marketing</label><Input name="marketingAngle" defaultValue={post.marketingAngle || ""} /></div>
                <div className="field"><label>Service</label><Select name="serviceId" defaultValue={post.serviceId || ""}><option value="">Aucun</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</Select></div>
                <div className="field"><label>Événement</label><Select name="eventId" defaultValue={post.eventId || ""}><option value="">Aucun</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</Select></div>
              </div>
              <div className="field"><label>Texte Facebook</label><Textarea name="facebookText" defaultValue={facebook} /></div>
              <div className="field"><label>Texte Instagram</label><Textarea name="instagramText" defaultValue={instagram} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field"><label>Hashtags</label><Input name="hashtags" defaultValue={post.hashtags.join(", ")} /></div>
                <div className="field"><label>CTA</label><Input name="callToAction" defaultValue={post.callToAction || ""} /></div>
                <div className="field"><label>Lien</label><Input name="link" defaultValue={post.link || ""} /></div>
                <div className="field"><label>Score Nova</label><Input name="novaScore" type="number" defaultValue={post.novaScore || ""} /></div>
              </div>
              <div className="field"><label>Prompt image IA</label><Textarea name="generatedImagePrompt" defaultValue={post.generatedImagePrompt || ""} /></div>
              <div className="field"><label>Justification stratégique</label><Textarea name="strategicJustification" defaultValue={post.strategicJustification || ""} /></div>
              <Button>Enregistrer le post</Button>
            </form>
            <div><p className="mb-2 text-sm font-medium text-slate-300">Facebook</p><div className="whitespace-pre-wrap rounded-md bg-slate-900 p-4 text-sm text-slate-200">{facebook || "Aucun texte Facebook."}</div></div>
            <div><p className="mb-2 text-sm font-medium text-slate-300">Instagram</p><div className="whitespace-pre-wrap rounded-md bg-slate-900 p-4 text-sm text-slate-200">{instagram || "Aucun texte Instagram."}</div></div>
            <div className="flex flex-wrap gap-3">
              <CopyButton text={facebook} label="Copier Facebook" />
              <CopyButton text={instagram} label="Copier Instagram" />
              <StatusButton postId={post.id} status="MANUALLY_SCHEDULED" label="Marquer comme programmé" redirectTo={calendarUrl} />
              <StatusButton postId={post.id} status="PUBLISHED" label="Marquer comme publié" redirectTo={calendarUrl} />
            </div>
            <PrepareMetaPanel postId={post.id} text={metaText} mediaUrl={post.mediaAsset?.url} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Stratégie Nova</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <p>Objectif: {post.objective || "Non défini"}</p>
              <p>Angle: {post.marketingAngle || "Non défini"}</p>
              <p>CTA: {post.callToAction || "Non défini"}</p>
              <p>Score Nova: {post.novaScore || "n/a"}</p>
              <p>{post.strategicJustification}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Média</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <PostImageGenerator postId={post.id} initialPrompt={post.generatedImagePrompt} />
              <PostMediaManager
                postId={post.id}
                currentMedia={post.mediaAsset}
                mediaAssets={mediaAssets}
                serviceId={post.serviceId}
                serviceName={post.service?.name || null}
                eventId={post.eventId}
                eventTitle={post.event?.title || null}
              />
            </CardContent>
          </Card>
          <form action={deletePost}><input type="hidden" name="id" value={post.id} /><Button variant="ghost" className="w-full text-red-200"><Trash2 className="h-4 w-4" />Supprimer le post</Button></form>
        </div>
      </section>
    </div>
  );
}
