import { NextResponse } from "next/server";
import { Platform } from "@prisma/client";
import { getDefaultCompany } from "@/app/actions";
import { generateStructuredNovaJson } from "@/lib/nova";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const company = await getDefaultCompany();
  const form = await request.formData().catch(() => null);
  const brief = form?.get("brief")?.toString() || "Créer un post utile et orienté conversion.";
  const [services, events, mediaAssets, posts] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { commercialPriority: "desc" } }),
    prisma.event.findMany({ where: { companyId: company.id, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.post.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const firstService = services[0];
  const firstMedia = mediaAssets[0];
  const bookingTarget = firstService?.bookingUrl || firstService?.bookingEmail || company.website;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const fallback = {
    post: {
      internalTitle: firstService ? `Mettre en avant ${firstService.name}` : "Post Nova conversion",
      objective: "Générer de l'intérêt qualifié",
      marketingAngle: "Montrer un bénéfice concret et inviter à passer à l'action",
      platform: "BOTH",
      recommendedDate: tomorrow.toISOString(),
      recommendedTime: "09:30",
      facebookText: firstService
        ? `Et si ${firstService.name} devenait votre prochain levier de croissance ?\n\n${firstService.shortDescription}\n\nÉcrivez-nous pour en parler.`
        : "Nova vous propose un post clair, régulier et orienté résultats pour renforcer votre présence sociale.",
      instagramText: firstService
        ? `${firstService.name}\n\n${firstService.shortDescription}\n\nEnvie d'en savoir plus ? Contactez-nous.`
        : "Une présence régulière construit la confiance. Nova prépare vos contenus pour garder le rythme.",
      hashtags: ["#CosmoAI", "#CommunityManagement", "#SocialMedia"],
      callToAction: firstService?.bookingEmail && !firstService.bookingUrl ? `Réserver par e-mail: ${firstService.bookingEmail}` : "Réserver un échange",
      link: bookingTarget,
      mediaAssetId: firstMedia?.id || null,
      generatedImagePrompt: firstMedia ? null : "Scène illustrée magique premium, ambiance féerique et familiale, sans texte, sans lettre, sans chiffre, sans enseigne.",
      novaScore: 78,
      strategicJustification: "Le post met en avant une priorité commerciale avec un CTA direct tout en restant sobre et utilisable sur Facebook et Instagram."
    }
  };

  const result = await generateStructuredNovaJson({
    schemaName: "post",
    fallback,
    prompt: `Génère un post complet pour Nova Social Planner à partir de ce brief: ${brief}

Contexte JSON:
${JSON.stringify({ company, services, events, mediaAssets, posts }, null, 2)}

La réponse doit contenir: titre interne, objectif, angle marketing, plateforme, date recommandée, heure recommandée, texte Facebook, texte Instagram, hashtags, CTA, lien, image recommandée parmi les médias existants si pertinente, prompt image sinon, score Nova et justification stratégique.

Si tu fournis un prompt image, il doit décrire uniquement une scène visuelle sans texte, sans lettre, sans chiffre, sans enseigne, sans affiche, sans slogan et sans URL.`
  });

  const post = (result as typeof fallback).post || fallback.post;
  const created = await prisma.post.create({
    data: {
      companyId: company.id,
      serviceId: firstService?.id,
      mediaAssetId: post.mediaAssetId || undefined,
      internalTitle: post.internalTitle,
      objective: post.objective,
      marketingAngle: post.marketingAngle,
      platform: post.platform as Platform,
      status: "AI_DRAFT",
      recommendedDate: post.recommendedDate ? new Date(post.recommendedDate) : null,
      recommendedTime: post.recommendedTime,
      facebookText: post.facebookText,
      instagramText: post.instagramText,
      hashtags: post.hashtags,
      callToAction: post.callToAction,
      link: post.link,
      generatedImagePrompt: post.generatedImagePrompt,
      novaScore: post.novaScore,
      strategicJustification: post.strategicJustification
    }
  });

  return NextResponse.json({ post: created, url: `/posts/${created.id}` });
}
