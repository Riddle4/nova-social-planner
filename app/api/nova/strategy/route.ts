import { NextResponse } from "next/server";
import { getDefaultCompany } from "@/app/actions";
import { generateStructuredNovaJson } from "@/lib/nova";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const company = await getDefaultCompany();
  const [services, events, mediaAssets, posts] = await Promise.all([
    prisma.service.findMany({ where: { companyId: company.id }, orderBy: { commercialPriority: "desc" } }),
    prisma.event.findMany({ where: { companyId: company.id, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    prisma.mediaAsset.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.post.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "desc" }, take: 40 })
  ]);

  const fallback = {
    strategy: {
      recommendedRhythm: "4 publications par semaine, avec 2 posts conversion, 1 post preuve sociale et 1 post communauté.",
      commercialPriorities: services.slice(0, 3).map((service) => service.name),
      recommendedCampaigns: [
        { name: "Accélération visibilité", objective: "Augmenter la régularité et la reconnaissance de marque" },
        { name: "Conversion douce", objective: "Transformer les services prioritaires en demandes de contact" }
      ],
      featuredServices: services.slice(0, 4).map((service) => service.name),
      supportedEvents: events.slice(0, 4).map((event) => event.title),
      postTypes: ["éducation", "conversion", "preuve sociale", "communauté", "événement"],
      recommendedDates: ["mardi 09:30", "jeudi 12:15", "vendredi 17:30", "dimanche 18:00"],
      buzzOpportunities: events.map((event) => `Compte à rebours éditorial pour ${event.title}`),
      mainRecommendations: [
        "Ne pas répéter la même offre deux fois de suite.",
        "Associer chaque service prioritaire à une preuve, un bénéfice et un CTA clair.",
        "Préparer les posts événementiels au moins 10 jours avant la date clé."
      ]
    }
  };

  const result = await generateStructuredNovaJson({
    schemaName: "strategy",
    fallback,
    prompt: `Crée une stratégie éditoriale mensuelle pour cette entreprise.

Contexte JSON:
${JSON.stringify({ company, services, events, mediaAssets, posts }, null, 2)}

La réponse doit inclure: rythme recommandé, priorités commerciales, campagnes recommandées, services à mettre en avant, événements à soutenir, types de posts, dates recommandées, opportunités de buzz et recommandations principales.`
  });

  const strategy = (result as typeof fallback).strategy || fallback.strategy;
  await prisma.novaRecommendation.create({
    data: {
      companyId: company.id,
      title: "Stratégie éditoriale mensuelle générée",
      category: "STRATEGY",
      content: strategy,
      priority: 90
    }
  });

  return NextResponse.json({ strategy });
}
