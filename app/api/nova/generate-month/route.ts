import { NextResponse } from "next/server";
import { getDefaultCompany } from "@/app/actions";
import { generateNovaImageAsset, generateStructuredNovaJson } from "@/lib/nova";
import {
  createMediaPicker,
  makeMonthlyFallbackPosts,
  mediaCooldownStart,
  monthLabel,
  normalizePlatform,
  normalizePostDate,
  parseMonth,
  type ProposedMonthlyPost
} from "@/lib/monthly-posts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MonthlyGenerationResult = {
  posts: ProposedMonthlyPost[];
  strategySummary?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const month = String(body.month || "");
  const approvedStrategy = body.strategy || null;
  const humanFeedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
  const parsed = parseMonth(month);
  if (!parsed) {
    return NextResponse.json({ error: "Le mois doit être au format YYYY-MM." }, { status: 400 });
  }

  const generateMissingImages = Boolean(body.generateMissingImages);
  const company = await getDefaultCompany();
  const cooldownStart = mediaCooldownStart(month, 2) || parsed.start;

  const [services, events, mediaAssets, existingMonthlyPosts, recentMediaPosts, recentPosts] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { commercialPriority: "desc" } }),
    prisma.event.findMany({
      where: {
        companyId: company.id,
        startsAt: {
          gte: parsed.start,
          lte: new Date(parsed.end.getTime() + 1000 * 60 * 60 * 24 * 21)
        }
      },
      orderBy: { startsAt: "asc" }
    }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: [{ lastUsedAt: "asc" }, { usageCount: "asc" }] }),
    prisma.post.findMany({
      where: {
        companyId: company.id,
        recommendedDate: { gte: parsed.start, lte: parsed.end },
        status: { not: "ARCHIVED" }
      },
      include: { mediaAsset: true }
    }),
    prisma.post.findMany({
      where: {
        companyId: company.id,
        recommendedDate: { gte: cooldownStart, lte: parsed.end },
        status: { not: "ARCHIVED" },
        mediaAssetId: { not: null }
      },
      select: { mediaAssetId: true, recommendedDate: true, internalTitle: true }
    }),
    prisma.post.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 40 })
  ]);

  const fallback: MonthlyGenerationResult = {
    strategySummary: `Calendrier éditorial généré pour ${monthLabel(month)}.`,
    posts: makeMonthlyFallbackPosts({ month, services, events })
  };

  const result = await generateStructuredNovaJson<MonthlyGenerationResult>({
    schemaName: "posts",
    fallback,
    prompt: `Crée tous les posts du mois de ${monthLabel(month)} pour Nova Social Planner.

Contraintes impératives:
- Génère entre 10 et 14 posts pour le mois, sauf si le contexte justifie moins.
- Toutes les dates doivent être dans le mois ${month}, au format YYYY-MM-DD.
- Ne propose aucune date en dehors du mois choisi.
- Équilibre conversion, émotion, éducation, communauté, preuve sociale et viralité.
- Utilise uniquement ces plateformes: FACEBOOK, INSTAGRAM ou BOTH.
- Pour chaque post, fournis si possible serviceId, eventId et mediaAssetId en utilisant les IDs du contexte.
- Si aucune image existante ne convient, fournis generatedImagePrompt.
- Les prompts image doivent décrire uniquement une scène visuelle sans texte, sans lettres, sans chiffres, sans enseigne, sans affiche, sans slogan et sans URL.
- N'utilise jamais une image utilisée dans les deux derniers mois.
- Si aucun média éligible n'existe, crée quand même le post sans mediaAssetId avec generatedImagePrompt.
- Le texte Facebook et le texte Instagram doivent être prêts à publier.
- Chaque post doit contenir un CTA clair dans callToAction ET dans les textes Facebook/Instagram.
- Utilise le bookingUrl ou bookingEmail du service/événement quand il existe.

Stratégie validée par l'humain:
${JSON.stringify(approvedStrategy, null, 2)}

Consigne humaine complémentaire:
${humanFeedback || "Aucune."}

Format JSON attendu:
{
  "strategySummary": "...",
  "posts": [
    {
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
      "generatedImagePrompt": "prompt si aucune image ne convient",
      "novaScore": 0,
      "strategicJustification": "..."
    }
  ]
}

Contexte JSON:
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
    existingMonthlyPosts,
    recentMediaPosts,
    recentPosts
  },
  null,
  2
)}`
  });

  const validServiceIds = new Set(services.map((service) => service.id));
  const validEventIds = new Set(events.map((event) => event.id));
  const existingMonthlyMediaUse = existingMonthlyPosts.reduce<Record<string, number>>((acc, post) => {
    if (post.mediaAssetId) acc[post.mediaAssetId] = (acc[post.mediaAssetId] || 0) + 1;
    return acc;
  }, {});
  const blockedMediaIds = new Set(recentMediaPosts.map((post) => post.mediaAssetId).filter(Boolean) as string[]);
  const pickMedia = createMediaPicker({ mediaAssets, existingMonthlyMediaUse, blockedMediaIds, maxUsesPerMedia: 1 });
  const aiPosts = Array.isArray(result.posts) && result.posts.length ? result.posts : fallback.posts;
  const proposedPosts = [...aiPosts];
  if (proposedPosts.length < 10) {
    const seen = new Set(proposedPosts.map((post) => `${post.recommendedDate}-${post.internalTitle}`));
    for (const fallbackPost of fallback.posts) {
      const key = `${fallbackPost.recommendedDate}-${fallbackPost.internalTitle}`;
      if (seen.has(key)) continue;
      proposedPosts.push(fallbackPost);
      seen.add(key);
      if (proposedPosts.length >= 10) break;
    }
  }
  const cappedProposedPosts = proposedPosts.slice(0, 14);

  const createdPosts = [];
  const touchedMediaIds = new Set<string>();

  for (const proposed of cappedProposedPosts) {
    const recommendedDate = normalizePostDate(proposed.recommendedDate, month);
    if (!recommendedDate) continue;

    const serviceId = proposed.serviceId && validServiceIds.has(proposed.serviceId) ? proposed.serviceId : null;
    const eventId = proposed.eventId && validEventIds.has(proposed.eventId) ? proposed.eventId : null;
    const service = serviceId ? services.find((item) => item.id === serviceId) : null;
    const event = eventId ? events.find((item) => item.id === eventId) : null;
    const mediaCandidate = pickMedia({ ...proposed, serviceId, eventId });
    let mediaAssetId = mediaCandidate?.id || null;
    let generatedImagePrompt =
      mediaAssetId
        ? null
        : proposed.generatedImagePrompt ||
          `Scène illustrée magique premium pour ${proposed.internalTitle}, sans texte, sans lettre, sans chiffre, sans affiche, sans enseigne.`;

    if (!mediaAssetId && generateMissingImages && generatedImagePrompt) {
      const generatedAssetData = await generateNovaImageAsset({
        prompt: generatedImagePrompt,
        companyId: company.id,
        title: `Image IA - ${proposed.internalTitle}`,
        serviceId,
        eventId
      });
      if (generatedAssetData) {
        const generatedAsset = await prisma.mediaAsset.create({ data: generatedAssetData });
        mediaAssetId = generatedAsset.id;
        generatedImagePrompt = null;
      }
    }

    if (mediaAssetId) touchedMediaIds.add(mediaAssetId);

    const created = await prisma.post.create({
      data: {
        companyId: company.id,
        serviceId: serviceId || undefined,
        eventId: eventId || undefined,
        mediaAssetId: mediaAssetId || undefined,
        internalTitle: proposed.internalTitle || "Post Nova",
        objective: proposed.objective || null,
        marketingAngle: proposed.marketingAngle || null,
        targetAudience: proposed.targetAudience || null,
        platform: normalizePlatform(proposed.platform),
        status: "AI_DRAFT",
        recommendedDate,
        recommendedTime: proposed.recommendedTime || "09:30",
        facebookText: ensureCta(proposed.facebookText || "", proposed.callToAction, proposed.link, service, event),
        instagramText: ensureCta(proposed.instagramText || "", proposed.callToAction, proposed.link, service, event),
        hashtags: proposed.hashtags || [],
        callToAction: proposed.callToAction || fallbackCta(service, event),
        link: proposed.link || event?.bookingUrl || service?.bookingUrl || event?.bookingEmail || service?.bookingEmail || null,
        generatedImagePrompt,
        novaScore: proposed.novaScore || null,
        strategicJustification: proposed.strategicJustification || null
      },
      include: { mediaAsset: true, service: true, event: true }
    });
    createdPosts.push(created);
  }

  await Promise.all(
    Array.from(touchedMediaIds).map((id) =>
      prisma.mediaAsset.update({
        where: { id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
      })
    )
  );

  if (createdPosts.length) {
    await prisma.novaRecommendation.create({
      data: {
        companyId: company.id,
        title: `Calendrier éditorial généré pour ${monthLabel(month)}`,
        category: "MONTHLY_POSTS",
        content: {
          month,
          mediaCooldownMonths: 2,
          generatedMissingImages: generateMissingImages,
          strategySummary: result.strategySummary || fallback.strategySummary,
          postIds: createdPosts.map((post) => post.id)
        },
        priority: 95
      }
    });
  }

  return NextResponse.json({
    month,
    strategySummary: result.strategySummary || fallback.strategySummary,
    createdCount: createdPosts.length,
    posts: createdPosts.map((post) => ({
      id: post.id,
      url: `/posts/${post.id}`,
      internalTitle: post.internalTitle,
      status: post.status,
      recommendedDate: post.recommendedDate,
      mediaTitle: post.mediaAsset?.title || post.mediaAsset?.filename || null,
      generatedImagePrompt: post.generatedImagePrompt,
      needsImage: !post.mediaAssetId
    }))
  });
}

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
