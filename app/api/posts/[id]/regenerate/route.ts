import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { PostStatus } from "@prisma/client";
import { getDefaultCompany } from "@/app/actions";
import { generateNovaImageAsset, generateStructuredNovaJson } from "@/lib/nova";
import { createMediaPicker, mediaCooldownStart, normalizePlatform, type ProposedMonthlyPost } from "@/lib/monthly-posts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RegeneratedPostResult = {
  post: ProposedMonthlyPost;
};

function fallbackCta(
  service?: { bookingUrl: string | null; bookingEmail: string | null } | null,
  event?: { bookingUrl: string | null; bookingEmail: string | null } | null
) {
  if (event?.bookingUrl || service?.bookingUrl) return "Réserver en ligne";
  const email = event?.bookingEmail || service?.bookingEmail;
  if (email) return `Réserver par e-mail: ${email}`;
  return "Nous contacter";
}

function ensureCta(
  text: string,
  proposedCta?: string | null,
  proposedLink?: string | null,
  service?: { bookingUrl: string | null; bookingEmail: string | null } | null,
  event?: { bookingUrl: string | null; bookingEmail: string | null } | null
) {
  const cta = proposedCta || fallbackCta(service, event);
  const link = proposedLink || event?.bookingUrl || service?.bookingUrl || event?.bookingEmail || service?.bookingEmail || "";
  const lower = text.toLowerCase();
  const hasCta = ["réserv", "contact", "inscri", "message", "écrivez", "lien"].some((word) => lower.includes(word));
  if (hasCta) return text;
  return `${text.trim()}\n\n${cta}${link ? `: ${link}` : ""}`.trim();
}

function monthFromPostDate(date: Date | null) {
  return (date || new Date()).toISOString().slice(0, 7);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const generateImage = Boolean(body.generateImage);

  if (!subject) {
    return NextResponse.json({ error: "Indiquez le sujet du post à régénérer." }, { status: 400 });
  }

  const company = await getDefaultCompany();
  const post = await prisma.post.findFirst({
    where: { id, companyId: company.id },
    include: { service: true, event: true, mediaAsset: true }
  });

  if (!post) {
    return NextResponse.json({ error: "Post introuvable." }, { status: 404 });
  }

  const month = monthFromPostDate(post.recommendedDate);
  const cooldownStart = mediaCooldownStart(month, 2) || new Date(Date.now() - 1000 * 60 * 60 * 24 * 62);

  const [services, events, mediaAssets, recentMediaPosts, recentPosts] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { commercialPriority: "desc" } }),
    prisma.event.findMany({ where: { companyId: company.id, startsAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) } }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: [{ lastUsedAt: "asc" }, { usageCount: "asc" }] }),
    prisma.post.findMany({
      where: {
        companyId: company.id,
        id: { not: post.id },
        recommendedDate: { gte: cooldownStart },
        status: { not: "ARCHIVED" },
        mediaAssetId: { not: null }
      },
      select: { mediaAssetId: true, recommendedDate: true, internalTitle: true }
    }),
    prisma.post.findMany({ where: { companyId: company.id, id: { not: post.id } }, orderBy: { createdAt: "desc" }, take: 30 })
  ]);

  const fallback: RegeneratedPostResult = {
    post: {
      internalTitle: subject,
      objective: post.objective || "Créer un contenu plus pertinent et prêt à publier",
      marketingAngle: `Recentrer le post sur: ${subject}`,
      targetAudience: post.targetAudience,
      platform: post.platform,
      recommendedDate: (post.recommendedDate || new Date()).toISOString().slice(0, 10),
      recommendedTime: post.recommendedTime || "09:30",
      facebookText: `${subject}\n\nUn contenu plus clair, plus utile et plus aligné avec l'objectif du mois.\n\n${fallbackCta(post.service, post.event)}.`,
      instagramText: `${subject}\n\nUne idée simple, visuelle et engageante pour la communauté.\n\n${fallbackCta(post.service, post.event)}.`,
      hashtags: post.hashtags.length ? post.hashtags : ["#CentreDeMagie", "#Magie", "#LaCote"],
      callToAction: post.callToAction || fallbackCta(post.service, post.event),
      link: post.link || post.event?.bookingUrl || post.service?.bookingUrl || post.event?.bookingEmail || post.service?.bookingEmail || null,
      serviceId: post.serviceId,
      eventId: post.eventId,
      generatedImagePrompt: `Illustration fantasy premium pour ${subject}, ambiance magique, familiale et professionnelle, sans texte, sans lettre, sans chiffre, sans affiche, sans enseigne.`,
      novaScore: 75,
      strategicJustification: "Post régénéré à partir de la consigne humaine pour mieux correspondre au sujet souhaité."
    }
  };

  const result = await generateStructuredNovaJson<RegeneratedPostResult>({
    schemaName: "post",
    fallback,
    prompt: `Régénère ce post existant pour Nova Social Planner.

Sujet imposé par l'humain:
${subject}

Objectif:
- Remplacer le texte Facebook et Instagram par un contenu prêt à publier.
- Garder une stratégie claire et un CTA visible.
- Choisir une image existante pertinente si possible, sinon fournir un prompt image.
- Le prompt image doit décrire uniquement une scène visuelle sans texte, sans lettre, sans chiffre, sans enseigne, sans affiche, sans slogan et sans URL.
- Ne pas répéter mécaniquement l'ancien texte.
- Conserver la date recommandée si elle est encore cohérente.

Post actuel:
${JSON.stringify(post, null, 2)}

Contexte:
${JSON.stringify(
  {
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
    recentMediaPosts,
    recentPosts
  },
  null,
  2
)}

Format JSON attendu:
{
  "post": {
    "internalTitle": "...",
    "objective": "...",
    "marketingAngle": "...",
    "targetAudience": "...",
    "platform": "BOTH",
    "recommendedDate": "YYYY-MM-DD",
    "recommendedTime": "09:30",
    "facebookText": "...",
    "instagramText": "...",
    "hashtags": ["..."],
    "callToAction": "...",
    "link": "...",
    "serviceId": "id ou null",
    "eventId": "id ou null",
    "mediaAssetId": "id ou null",
    "generatedImagePrompt": "prompt si aucune image existante ne convient",
    "novaScore": 0,
    "strategicJustification": "..."
  }
}`
  });

  const proposed = result.post || fallback.post;
  const service = proposed.serviceId ? services.find((item) => item.id === proposed.serviceId) || post.service : post.service;
  const event = proposed.eventId ? events.find((item) => item.id === proposed.eventId) || post.event : post.event;
  const validServiceId = service?.id || null;
  const validEventId = event?.id || null;
  const blockedMediaIds = new Set(recentMediaPosts.map((item) => item.mediaAssetId).filter(Boolean) as string[]);
  const pickMedia = createMediaPicker({
    mediaAssets,
    existingMonthlyMediaUse: post.mediaAssetId ? { [post.mediaAssetId]: 1 } : {},
    blockedMediaIds,
    maxUsesPerMedia: 1
  });

  const mediaCandidate = pickMedia({ ...proposed, serviceId: validServiceId, eventId: validEventId });
  let mediaAssetId = generateImage ? null : mediaCandidate?.id || null;
  let generatedImagePrompt =
    mediaAssetId
      ? null
      : proposed.generatedImagePrompt ||
        `Illustration fantasy premium pour ${proposed.internalTitle || subject}, ambiance magique et familiale, sans texte, sans lettre, sans chiffre, sans affiche, sans enseigne.`;

  if (generateImage && generatedImagePrompt) {
    const generatedAssetData = await generateNovaImageAsset({
      prompt: generatedImagePrompt,
      companyId: company.id,
      title: `Image IA - ${proposed.internalTitle || subject}`,
      serviceId: validServiceId,
      eventId: validEventId
    });
    if (generatedAssetData) {
      const generatedAsset = await prisma.mediaAsset.create({ data: generatedAssetData });
      mediaAssetId = generatedAsset.id;
      generatedImagePrompt = null;
    }
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data: {
      serviceId: validServiceId || undefined,
      eventId: validEventId || undefined,
      mediaAssetId: mediaAssetId || null,
      internalTitle: proposed.internalTitle || subject,
      objective: proposed.objective || null,
      marketingAngle: proposed.marketingAngle || null,
      targetAudience: proposed.targetAudience || null,
      platform: normalizePlatform(proposed.platform),
      status: post.status === "PUBLISHED" ? post.status : ("AI_DRAFT" as PostStatus),
      recommendedDate: proposed.recommendedDate ? new Date(`${proposed.recommendedDate}T12:00:00.000Z`) : post.recommendedDate,
      recommendedTime: proposed.recommendedTime || post.recommendedTime,
      facebookText: ensureCta(proposed.facebookText || "", proposed.callToAction, proposed.link, service, event),
      instagramText: ensureCta(proposed.instagramText || "", proposed.callToAction, proposed.link, service, event),
      hashtags: proposed.hashtags || [],
      callToAction: proposed.callToAction || fallbackCta(service, event),
      link: proposed.link || event?.bookingUrl || service?.bookingUrl || event?.bookingEmail || service?.bookingEmail || null,
      generatedImagePrompt,
      novaScore: proposed.novaScore || null,
      strategicJustification: proposed.strategicJustification || null
    },
    include: { mediaAsset: true }
  });

  if (mediaAssetId) {
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
    });
  }

  revalidatePath(`/posts/${post.id}`);
  revalidatePath("/calendar");
  revalidatePath("/posts");

  return NextResponse.json({
    post: updated,
    mediaTitle: updated.mediaAsset?.title || updated.mediaAsset?.filename || null
  });
}
