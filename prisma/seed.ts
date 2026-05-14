import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { id: "demo-company" },
    update: {},
    create: {
      id: "demo-company",
      name: "Cosmo Atelier",
      description: "Studio de services premium qui veut accélérer sa présence Facebook et Instagram.",
      website: "https://cosmo-ai.local",
      brandTone: "premium, chaleureux, précis, orienté conversion",
      facebookUrl: "https://facebook.com/cosmo",
      instagramUrl: "https://instagram.com/cosmo",
      defaultLanguage: "fr",
      timezone: "Europe/Zurich"
    }
  });

  const service = await prisma.service.upsert({
    where: { id: "demo-service" },
    update: {},
    create: {
      id: "demo-service",
      companyId: company.id,
      name: "Audit présence sociale",
      shortDescription: "Analyse claire de vos contenus Facebook et Instagram avec plan d'action.",
      longDescription: "Nova identifie les opportunités de régularité, de conversion et de différenciation.",
      targetAudience: "PME locales, indépendants et équipes marketing",
      benefits: "Clarté, rythme éditorial, meilleures conversions",
      pricingInfo: "Dès CHF 490",
      bookingUrl: "https://cosmo-ai.local/book",
      seasonality: "Toute l'année",
      commercialPriority: "HIGH",
      salesArguments: "Rapide à mettre en place, directement actionnable, orienté business.",
      frequentObjections: "Manque de temps, peur de manquer d'idées, difficulté à mesurer l'impact."
    }
  });

  await prisma.event.upsert({
    where: { id: "demo-event" },
    update: {},
    create: {
      id: "demo-event",
      companyId: company.id,
      title: "Workshop stratégie Instagram",
      description: "Session pratique pour préparer un mois de contenus cohérents.",
      startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14 + 1000 * 60 * 60 * 2),
      location: "Lausanne",
      targetAudience: "Entrepreneurs et responsables communication",
      bookingUrl: "https://cosmo-ai.local/workshop",
      registrationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      commercialPriority: "HIGH",
      objective: "Remplir l'atelier",
      internalNotes: "Prévoir un compte à rebours éditorial."
    }
  });

  await prisma.post.upsert({
    where: { id: "demo-post" },
    update: {},
    create: {
      id: "demo-post",
      companyId: company.id,
      serviceId: service.id,
      internalTitle: "Pourquoi auditer sa présence sociale maintenant",
      objective: "Éduquer et convertir",
      marketingAngle: "Montrer que le manque de régularité coûte des opportunités",
      platform: "BOTH",
      status: "TO_VALIDATE",
      recommendedDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      recommendedTime: "09:30",
      facebookText: "Votre présence sociale travaille-t-elle vraiment pour votre entreprise ?\n\nUn audit révèle les contenus qui créent de la confiance, ceux qui convertissent et ceux qui peuvent être simplifiés.\n\nRéservez un échange pour identifier vos prochaines priorités.",
      instagramText: "Votre contenu peut faire plus que remplir un calendrier.\n\nAvec un audit, vous identifiez ce qui attire, rassure et convertit.\n\nRéservez un échange.",
      hashtags: ["#SocialMedia", "#InstagramMarketing", "#CosmoAI"],
      callToAction: "Réserver un échange",
      link: "https://cosmo-ai.local/book",
      novaScore: 82,
      strategicJustification: "Le contenu éduque avant de vendre et crée une transition naturelle vers le service prioritaire."
    }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
