import { NextResponse } from "next/server";
import { getDefaultCompany } from "@/app/actions";
import { generateStructuredNovaJson } from "@/lib/nova";
import { mediaCooldownStart, monthLabel, parseMonth } from "@/lib/monthly-posts";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type MonthlyStrategyResult = {
  strategy: {
    month: string;
    summary: string;
    recommendedRhythm: string;
    commercialPriorities: string[];
    campaigns: { title: string; objective: string; focus: string }[];
    contentBalance: string[];
    proposedPosts: {
      date: string;
      time: string;
      platform: "FACEBOOK" | "INSTAGRAM" | "BOTH";
      objective: string;
      focus: string;
      angle: string;
      serviceId?: string | null;
      eventId?: string | null;
      cta: string;
      imageNeed: string;
    }[];
    notes: string[];
  };
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const month = String(body.month || "");
  const humanFeedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
  const parsed = parseMonth(month);
  if (!parsed) {
    return NextResponse.json({ error: "Le mois doit être au format YYYY-MM." }, { status: 400 });
  }

  const company = await getDefaultCompany();
  const cooldownStart = mediaCooldownStart(month, 2) || parsed.start;
  const [services, events, mediaAssets, recentPosts] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { commercialPriority: "desc" } }),
    prisma.event.findMany({
      where: {
        companyId: company.id,
        startsAt: { gte: parsed.start, lte: new Date(parsed.end.getTime() + 1000 * 60 * 60 * 24 * 21) }
      },
      orderBy: { startsAt: "asc" }
    }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: [{ usageCount: "asc" }, { createdAt: "desc" }] }),
    prisma.post.findMany({
      where: {
        companyId: company.id,
        recommendedDate: { gte: cooldownStart, lte: parsed.end },
        status: { not: "ARCHIVED" }
      },
      orderBy: { recommendedDate: "desc" },
      take: 80,
      include: { mediaAsset: true, service: true, event: true }
    })
  ]);

  const fallback: MonthlyStrategyResult = {
    strategy: {
      month,
      summary: `Stratégie éditoriale pour ${monthLabel(month)} avec priorité aux offres commerciales les plus importantes.`,
      recommendedRhythm: "3 posts par semaine, équilibrés entre conversion, émotion, éducation et communauté.",
      commercialPriorities: services.slice(0, 5).map((service) => service.name),
      campaigns: services.slice(0, 3).map((service) => ({
        title: service.name,
        objective: "Générer des demandes qualifiées",
        focus: service.shortDescription
      })),
      contentBalance: ["conversion", "émotion", "éducation", "communauté", "preuve sociale"],
      proposedPosts: services.slice(0, 12).map((service, index) => ({
        date: new Date(Date.UTC(parsed.year, parsed.monthIndex, 2 + index * 2, 12)).toISOString().slice(0, 10),
        time: ["09:30", "12:15", "17:30"][index % 3],
        platform: "BOTH",
        objective: index % 3 === 0 ? "Conversion" : index % 3 === 1 ? "Émotion" : "Éducation",
        focus: service.name,
        angle: service.benefits || service.shortDescription,
        serviceId: service.id,
        eventId: null,
        cta: service.bookingUrl ? "Réserver en ligne" : service.bookingEmail ? `Réserver par e-mail: ${service.bookingEmail}` : "Nous contacter",
        imageNeed: "Image liée au service, sinon post à signaler sans image."
      })),
      notes: ["Les images utilisées dans les deux derniers mois ne doivent pas être reprises."]
    }
  };

  const result = await generateStructuredNovaJson<MonthlyStrategyResult>({
    schemaName: "strategy",
    fallback,
    prompt: `Crée une stratégie de posts pour ${monthLabel(month)}.

Cette étape ne doit pas rédiger tous les posts complets. Elle doit produire un plan que l'humain pourra valider avant génération.

Consigne humaine éventuelle:
${humanFeedback || "Aucune consigne supplémentaire."}

Contraintes:
- Propose entre 10 et 14 posts.
- Toutes les dates doivent être dans le mois ${month}, au format YYYY-MM-DD.
- Chaque post proposé doit inclure un objectif, un focus, un angle, une plateforme, un CTA prévu et un besoin image.
- Prends en compte les services, événements et priorités commerciales.
- Ne propose pas de réutiliser une image utilisée dans les deux derniers mois.
- Les CTA doivent exploiter bookingUrl ou bookingEmail quand ils existent.

Réponds en JSON avec la racine "strategy".

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
      tags: asset.tags,
      usageCount: asset.usageCount,
      lastUsedAt: asset.lastUsedAt
    })),
    recentPosts: recentPosts.map((post) => ({
      id: post.id,
      title: post.internalTitle,
      date: post.recommendedDate,
      mediaAssetId: post.mediaAssetId,
      mediaTitle: post.mediaAsset?.title,
      service: post.service?.name,
      event: post.event?.title
    }))
  },
  null,
  2
)}`
  });

  const strategy = result.strategy || fallback.strategy;
  await prisma.novaRecommendation.updateMany({
    where: { companyId: company.id, category: "MONTHLY_STRATEGY", isArchived: false },
    data: { isArchived: true }
  });
  const savedStrategy = await prisma.novaRecommendation.create({
    data: {
      companyId: company.id,
      title: `Stratégie de posts proposée pour ${monthLabel(month)}`,
      category: "MONTHLY_STRATEGY",
      content: { strategy, feedback: humanFeedback },
      priority: 90
    }
  });

  return NextResponse.json({ strategy, strategyId: savedStrategy.id });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const company = await getDefaultCompany();
  const id = typeof body.id === "string" ? body.id : null;

  if (id) {
    await prisma.novaRecommendation.updateMany({
      where: { id, companyId: company.id, category: "MONTHLY_STRATEGY" },
      data: { isArchived: true }
    });
  } else {
    await prisma.novaRecommendation.updateMany({
      where: { companyId: company.id, category: "MONTHLY_STRATEGY", isArchived: false },
      data: { isArchived: true }
    });
  }

  return NextResponse.json({ ok: true });
}
