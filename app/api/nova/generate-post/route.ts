import { NextResponse } from "next/server";
import { getDefaultCompany } from "@/app/actions";
import { generateNovaImageAsset, generateStructuredNovaJson } from "@/lib/nova";
import { createMediaPicker, mediaCooldownStart, normalizePlatform, type ProposedMonthlyPost } from "@/lib/monthly-posts";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const company = await getDefaultCompany();
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await request.json().catch(() => ({})) : null;
  const form = body ? null : await request.formData().catch(() => null);
  const brief = String(body?.brief || form?.get("brief") || "Créer un post utile et orienté conversion.").trim();
  const requestedDate = String(body?.recommendedDate || form?.get("recommendedDate") || "").trim();
  const generateImage = Boolean(body?.generateImage || form?.get("generateImage"));
  const [services, events, mediaAssets, posts, recentMediaPosts] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { commercialPriority: "desc" } }),
    prisma.event.findMany({ where: { companyId: company.id, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: [{ lastUsedAt: "asc" }, { usageCount: "asc" }] }),
    prisma.post.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.post.findMany({
      where: {
        companyId: company.id,
        recommendedDate: { gte: requestedDate ? mediaCooldownStart(requestedDate.slice(0, 7), 2) || undefined : undefined },
        status: { not: "ARCHIVED" },
        mediaAssetId: { not: null }
      },
      select: { mediaAssetId: true, recommendedDate: true, internalTitle: true }
    })
  ]);
  const firstService = services[0];
  const firstMedia = mediaAssets[0];
  const bookingTarget = firstService?.bookingUrl || firstService?.bookingEmail || company.website;
  const targetDate = requestedDate ? new Date(`${requestedDate}T12:00:00.000Z`) : new Date();
  if (!requestedDate) targetDate.setDate(targetDate.getDate() + 1);

  const fallback: { post: ProposedMonthlyPost } = {
    post: {
      internalTitle: brief || (firstService ? `Mettre en avant ${firstService.name}` : "Post Nova conversion"),
      objective: "Générer de l'intérêt qualifié",
      marketingAngle: `Créer un contenu utile autour de: ${brief}`,
      platform: "BOTH",
      recommendedDate: targetDate.toISOString().slice(0, 10),
      recommendedTime: "09:30",
      facebookText: firstService
        ? `${brief}\n\n${firstService.shortDescription}\n\n${firstService.bookingUrl || firstService.bookingEmail ? "Réservez votre place ou contactez-nous pour en savoir plus." : "Écrivez-nous pour en parler."}`
        : "Nova vous propose un post clair, régulier et orienté résultats pour renforcer votre présence sociale.",
      instagramText: firstService
        ? `${brief}\n\n${firstService.shortDescription}\n\nEnvie d'en savoir plus ? Contactez-nous.`
        : "Une présence régulière construit la confiance. Nova prépare vos contenus pour garder le rythme.",
      hashtags: ["#CentreDeMagie", "#Magie", "#LaCote"],
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
    prompt: `Génère un post complet pour Nova Social Planner à partir de ce sujet: ${brief}

Date imposée:
${targetDate.toISOString().slice(0, 10)}

Contexte JSON:
${JSON.stringify({
  company,
  services,
  events,
  mediaAssets: mediaAssets.map((asset) => ({
    id: asset.id,
    serviceId: asset.serviceId,
    eventId: asset.eventId,
    title: asset.title,
    description: asset.description,
    tags: asset.tags,
    source: asset.source,
    usageCount: asset.usageCount,
    lastUsedAt: asset.lastUsedAt
  })),
  posts,
  recentMediaPosts
}, null, 2)}

La réponse doit contenir: titre interne, objectif, angle marketing, plateforme, date recommandée, heure recommandée, texte Facebook, texte Instagram, hashtags, CTA, lien, serviceId, eventId, mediaAssetId si une image existante est pertinente, prompt image sinon, score Nova et justification stratégique.

Contraintes:
- recommendedDate doit être exactement ${targetDate.toISOString().slice(0, 10)}.
- Les textes doivent contenir un CTA clair.
- Utilise le bookingUrl ou bookingEmail du service/événement quand il existe.
- Si tu fournis un prompt image, il doit décrire uniquement une scène visuelle sans texte, sans lettre, sans chiffre, sans enseigne, sans affiche, sans slogan et sans URL.`
  });

  const post = (result as typeof fallback).post || fallback.post;
  const service = post.serviceId ? services.find((item) => item.id === post.serviceId) || firstService : firstService;
  const event = post.eventId ? events.find((item) => item.id === post.eventId) || null : null;
  const blockedMediaIds = new Set(recentMediaPosts.map((item) => item.mediaAssetId).filter(Boolean) as string[]);
  const pickMedia = createMediaPicker({ mediaAssets, existingMonthlyMediaUse: {}, blockedMediaIds, maxUsesPerMedia: 1 });
  const mediaCandidate = generateImage ? null : pickMedia({ ...post, serviceId: service?.id, eventId: event?.id });
  let mediaAssetId = mediaCandidate?.id || null;
  let generatedImagePrompt =
    mediaAssetId
      ? null
      : post.generatedImagePrompt || `Scène illustrée magique premium pour ${post.internalTitle}, sans texte, sans lettre, sans chiffre, sans affiche, sans enseigne.`;

  if (generateImage && generatedImagePrompt) {
    const generatedAssetData = await generateNovaImageAsset({
      prompt: generatedImagePrompt,
      companyId: company.id,
      title: `Image IA - ${post.internalTitle}`,
      serviceId: service?.id,
      eventId: event?.id
    });
    if (generatedAssetData) {
      const generatedAsset = await prisma.mediaAsset.create({ data: generatedAssetData });
      mediaAssetId = generatedAsset.id;
      generatedImagePrompt = null;
    }
  }

  const created = await prisma.post.create({
    data: {
      companyId: company.id,
      serviceId: service?.id,
      eventId: event?.id,
      mediaAssetId: mediaAssetId || undefined,
      internalTitle: post.internalTitle,
      objective: post.objective,
      marketingAngle: post.marketingAngle,
      targetAudience: post.targetAudience,
      platform: normalizePlatform(post.platform),
      status: "AI_DRAFT",
      recommendedDate: targetDate,
      recommendedTime: post.recommendedTime,
      facebookText: post.facebookText,
      instagramText: post.instagramText,
      hashtags: post.hashtags,
      callToAction: post.callToAction,
      link: post.link,
      generatedImagePrompt,
      novaScore: post.novaScore,
      strategicJustification: post.strategicJustification
    }
  });

  if (mediaAssetId) {
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
    });
  }

  return NextResponse.json({ post: created, url: `/posts/${created.id}` });
}
