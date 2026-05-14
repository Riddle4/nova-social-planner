import { upsertCompany, getDefaultCompany } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NovaGenerator } from "@/components/nova-generator";
import { prisma } from "@/lib/prisma";

export default async function NovaPage() {
  const company = await getDefaultCompany();
  const [services, events, posts, media, latestStrategy] = await Promise.all([
    prisma.service.count({ where: { companyId: company.id } }),
    prisma.event.count({ where: { companyId: company.id } }),
    prisma.post.count({ where: { companyId: company.id } }),
    prisma.mediaAsset.count({ where: { companyId: company.id } }),
    prisma.novaRecommendation.findFirst({
      where: { companyId: company.id, category: "MONTHLY_STRATEGY", isArchived: false },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold text-white">Nova Studio</h1><p className="mt-2 text-slate-400">Générez stratégie, campagnes, idées et posts complets.</p></div>
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-2xl font-semibold">{services}</p><p className="text-sm text-slate-400">services</p></Card>
        <Card className="p-4"><p className="text-2xl font-semibold">{events}</p><p className="text-sm text-slate-400">événements</p></Card>
        <Card className="p-4"><p className="text-2xl font-semibold">{media}</p><p className="text-sm text-slate-400">médias</p></Card>
        <Card className="p-4"><p className="text-2xl font-semibold">{posts}</p><p className="text-sm text-slate-400">posts</p></Card>
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profil entreprise</CardTitle></CardHeader>
          <CardContent>
            <form action={upsertCompany} className="grid gap-4">
              <div className="field"><label>Nom</label><Input name="name" defaultValue={company.name} /></div>
              <div className="field"><label>Description</label><Textarea name="description" defaultValue={company.description || ""} /></div>
              <div className="field"><label>Site web</label><Input name="website" defaultValue={company.website || ""} /></div>
              <div className="field"><label>Ton de marque</label><Input name="brandTone" defaultValue={company.brandTone || ""} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field"><label>Facebook</label><Input name="facebookUrl" defaultValue={company.facebookUrl || ""} /></div>
                <div className="field"><label>Instagram</label><Input name="instagramUrl" defaultValue={company.instagramUrl || ""} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field"><label>Langue</label><Input name="defaultLanguage" defaultValue={company.defaultLanguage} /></div>
                <div className="field"><label>Fuseau horaire</label><Input name="timezone" defaultValue={company.timezone} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="field"><label>Facebook Page ID</label><Input name="metaFacebookPageId" defaultValue={company.metaFacebookPageId || ""} /></div>
                <div className="field"><label>Instagram Business ID</label><Input name="metaInstagramBusinessId" defaultValue={company.metaInstagramBusinessId || ""} /></div>
              </div>
              <Button>Enregistrer</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Générations Nova</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <NovaGenerator
              initialStrategy={
                latestStrategy?.content &&
                typeof latestStrategy.content === "object" &&
                "strategy" in latestStrategy.content
                  ? (latestStrategy.content as { strategy?: unknown }).strategy
                  : null
              }
              initialFeedback={
                latestStrategy?.content &&
                typeof latestStrategy.content === "object" &&
                "feedback" in latestStrategy.content
                  ? String((latestStrategy.content as { feedback?: unknown }).feedback || "")
                  : ""
              }
              initialStrategyId={latestStrategy?.id || null}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
