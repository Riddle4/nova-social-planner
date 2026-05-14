import { Platform, type Event, type MediaAsset, type Service } from "@prisma/client";

export type ProposedMonthlyPost = {
  internalTitle: string;
  objective?: string | null;
  marketingAngle?: string | null;
  targetAudience?: string | null;
  platform?: string | null;
  recommendedDate: string;
  recommendedTime?: string | null;
  facebookText?: string | null;
  instagramText?: string | null;
  hashtags?: string[];
  callToAction?: string | null;
  link?: string | null;
  serviceId?: string | null;
  eventId?: string | null;
  mediaAssetId?: string | null;
  generatedImagePrompt?: string | null;
  novaScore?: number | null;
  strategicJustification?: string | null;
};

export function parseMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  const start = new Date(Date.UTC(year, monthIndex, 1, 12));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));
  return { year, monthIndex, start, end };
}

export function monthLabel(month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return month;
  return new Intl.DateTimeFormat("fr-CH", { month: "long", year: "numeric" }).format(parsed.start);
}

export function mediaCooldownStart(month: string, months = 2) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.year, parsed.monthIndex - months, 1, 0, 0, 0));
}

export function makeMonthlyFallbackPosts(params: {
  month: string;
  services: Service[];
  events: Event[];
}) {
  const parsed = parseMonth(params.month);
  if (!parsed) return [];
  const postTypes = [
    { objective: "Éduquer", angle: "Donner un conseil utile et créer la confiance" },
    { objective: "Émotion / communauté", angle: "Montrer l'expérience vécue et l'envie de participer" },
    { objective: "Conversion", angle: "Mettre en avant une offre claire avec un CTA direct" }
  ];
  const dates: Date[] = [];
  for (let day = 2; day <= parsed.end.getUTCDate(); day += 3) {
    dates.push(new Date(Date.UTC(parsed.year, parsed.monthIndex, day, 12)));
  }

  return dates.slice(0, 12).map((date, index): ProposedMonthlyPost => {
    const service = params.services[index % Math.max(params.services.length, 1)];
    const event = params.events.find((item) => {
      const diff = item.startsAt.getTime() - date.getTime();
      return diff >= 0 && diff <= 1000 * 60 * 60 * 24 * 14;
    });
    const type = postTypes[index % postTypes.length];
    const subject = event?.title || service?.name || "l'entreprise";
    const bookingEmail = event?.bookingEmail || service?.bookingEmail || null;
    const link = event?.bookingUrl || service?.bookingUrl || bookingEmail || null;

    return {
      internalTitle: `${type.objective} - ${subject}`,
      objective: type.objective,
      marketingAngle: type.angle,
      platform: "BOTH",
      recommendedDate: date.toISOString().slice(0, 10),
      recommendedTime: ["09:30", "12:15", "17:30"][index % 3],
      facebookText: `${subject}\n\n${service?.shortDescription || event?.description || "Une occasion de créer un contenu utile, clair et engageant."}\n\n${link ? "Réservez votre place ou contactez-nous pour en savoir plus." : "Contactez-nous pour en savoir plus."}`,
      instagramText: `${subject}\n\n${service?.shortDescription || event?.description || "Un moment à partager avec votre communauté."}\n\n${link ? "Lien de réservation disponible." : "Écrivez-nous en message privé."}`,
      hashtags: ["#NovaSocialPlanner", "#CommunityManagement", "#Instagram"],
      callToAction: bookingEmail && !event?.bookingUrl && !service?.bookingUrl ? `Réserver par e-mail: ${bookingEmail}` : link ? "Réserver" : "Nous contacter",
      link,
      serviceId: service?.id,
      eventId: event?.id,
      generatedImagePrompt: `Scène illustrée magique premium autour de ${subject}, ambiance familiale et féerique, sans texte, sans lettre, sans chiffre, sans affiche, sans enseigne.`,
      novaScore: 72,
      strategicJustification: "Post planifié pour équilibrer éducation, émotion et conversion sur le mois choisi."
    };
  });
}

export function normalizePlatform(value?: string | null): Platform {
  if (value === "FACEBOOK" || value === "INSTAGRAM" || value === "BOTH") return value;
  return "BOTH";
}

export function normalizePostDate(value: string, month: string) {
  const parsed = parseMonth(month);
  if (!parsed) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date < parsed.start || date > parsed.end) return null;
  return date;
}

export function createMediaPicker(params: {
  mediaAssets: MediaAsset[];
  existingMonthlyMediaUse: Record<string, number>;
  blockedMediaIds?: Set<string>;
  maxUsesPerMedia?: number;
}) {
  const batchUse: Record<string, number> = {};
  const assets = params.mediaAssets;

  function usage(assetId: string) {
    return (params.existingMonthlyMediaUse[assetId] || 0) + (batchUse[assetId] || 0);
  }

  function canUse(assetId: string) {
    if (params.blockedMediaIds?.has(assetId)) return false;
    return usage(assetId) < (params.maxUsesPerMedia || 1);
  }

  function score(asset: MediaAsset, post: ProposedMonthlyPost) {
    let points = 0;
    if (post.mediaAssetId === asset.id) points += 8;
    if (post.serviceId && asset.serviceId === post.serviceId) points += 5;
    if (post.eventId && asset.eventId === post.eventId) points += 6;
    if (asset.tags.some((tag) => post.internalTitle.toLowerCase().includes(tag.toLowerCase()))) points += 2;
    points -= usage(asset.id) * 4;
    points -= Math.min(asset.usageCount, 10) * 0.2;
    return points;
  }

  return function pick(post: ProposedMonthlyPost) {
    const candidates = assets
      .filter((asset) => canUse(asset.id))
      .map((asset) => ({ asset, score: score(asset, post) }))
      .sort((a, b) => b.score - a.score || a.asset.usageCount - b.asset.usageCount);

    const selected = candidates[0]?.asset;
    if (selected && candidates[0].score > -8) {
      batchUse[selected.id] = (batchUse[selected.id] || 0) + 1;
      return selected;
    }

    return null;
  };
}
