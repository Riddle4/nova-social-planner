import OpenAI from "openai";
import path from "node:path";
import sharp from "sharp";
import { uploadMediaBuffer } from "@/lib/storage";

export const NOVA_TEXT_MODEL = process.env.NOVA_TEXT_MODEL || "gpt-5";
export const NOVA_IMAGE_MODEL = process.env.NOVA_IMAGE_MODEL || "gpt-image-1.5";
export const NOVA_IMAGE_FALLBACK_MODEL = process.env.NOVA_IMAGE_FALLBACK_MODEL || "gpt-image-1";

export const NOVA_SYSTEM_PROMPT = `Tu es Nova, l'agent community manager de Cosmo AI.

Ta mission est d'aider une entreprise à développer sa visibilité, son engagement, ses followers et ses conversions sur Facebook et Instagram.

Tu dois créer une stratégie éditoriale cohérente, régulière et orientée résultats.

Tu prends en compte :
- les services proposés par l'entreprise ;
- les événements à venir ;
- la banque d'images disponible ;
- le ton de marque ;
- la cible ;
- les objectifs commerciaux ;
- le calendrier ;
- les posts déjà créés ;
- les performances passées si disponibles.

Tu ne dois pas seulement rédiger des textes. Tu dois penser comme une community manager stratégique.

Pour chaque post, tu dois définir :
- l'objectif ;
- l'angle ;
- la cible ;
- la plateforme ;
- le texte Facebook ;
- le texte Instagram ;
- l'appel à l'action ;
- les hashtags ;
- le type d'image recommandé ;
- l'image existante à utiliser si elle est pertinente ;
- sinon un prompt d'image à générer ;
- une date et une heure recommandées ;
- un score estimé de performance ;
- une courte justification stratégique.

Tu dois équilibrer les contenus :
- conversion ;
- émotion ;
- éducation ;
- communauté ;
- preuve sociale ;
- viralité.

Tu dois éviter de répéter trop souvent les mêmes formulations, les mêmes images ou les mêmes offres.

Tu dois toujours produire des contenus prêts à être utilisés, mais laisser à l'humain la décision finale de validation.`;

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function generateStructuredNovaJson<T>(params: {
  schemaName: string;
  prompt: string;
  fallback: T;
}) {
  const client = getOpenAIClient();
  if (!client) return params.fallback;

  const response = await client.chat.completions.create({
    model: NOVA_TEXT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: NOVA_SYSTEM_PROMPT },
      {
        role: "user",
        content: `${params.prompt}\n\nRéponds uniquement en JSON valide avec une racine "${params.schemaName}".`
      }
    ]
  });

  const content = response.choices[0]?.message.content;
  if (!content) return params.fallback;

  try {
    return JSON.parse(content) as T;
  } catch {
    return params.fallback;
  }
}

export async function generateNovaImageAsset(params: {
  prompt: string;
  companyId: string;
  title: string;
  serviceId?: string | null;
  eventId?: string | null;
}) {
  const client = getOpenAIClient();
  if (!client || !params.prompt.trim()) return null;

  try {
    const imagePrompt = `Crée une image pour la communication Facebook/Instagram du Centre de Magie.

Direction artistique obligatoire:
- style illustration fantasy premium, affiche magique éditoriale, peinture digitale raffinée;
- ne cherche pas à produire une photographie réaliste;
- ne reproduis pas une personne réelle ni un visage identifiable;
- si un magicien apparaît, il doit être stylisé, de dos, en silhouette ou partiellement visible;
- accessoires de magie stylisés et crédibles, sans mains déformées ni objets incohérents;
- ambiance chaleureuse, magique, familiale, professionnelle, adaptée à des enfants et parents;
- composition carrée claire, utilisable comme visuel social media;
- image purement visuelle, sans texte du tout;
- n'écris aucun mot, aucune lettre, aucun chiffre, aucune enseigne, aucun slogan, aucun titre;
- ne tente jamais d'écrire "Centre de Magie", "CMC", un nom de service, une URL ou un appel à l'action dans l'image;
- aucun logo généré, aucune marque générée, aucun filigrane généré;
- le vrai logo CMC sera ajouté automatiquement après génération par l'application;
- éviter l'effet stock photo, éviter le rendu plastique, éviter les personnages hyperréalistes.

Brief:
${params.prompt}`;

    const response = await generateImageWithFallback(client, imagePrompt);
    const image = response.data?.[0]?.b64_json;
    if (!image) return null;

    const imageBuffer = Buffer.from(image, "base64");
    const finalImageBuffer = await addCmcLogoToImage(imageBuffer);
    const uploaded = await uploadMediaBuffer({
      buffer: finalImageBuffer,
      filename: "nova-generated.png",
      contentType: "image/png",
      folder: "generated"
    });

    return {
      companyId: params.companyId,
      serviceId: params.serviceId || undefined,
      eventId: params.eventId || undefined,
      url: uploaded.url,
      filename: uploaded.filename,
      type: "image/png",
      title: params.title,
      description: imagePrompt,
      tags: ["nova", "generated", "illustration", "fantasy"],
      source: "GENERATED" as const
    };
  } catch (error) {
    console.error("Nova image generation failed", error);
    return null;
  }
}

async function generateImageWithFallback(client: OpenAI, prompt: string) {
  try {
    return await client.images.generate({
      model: NOVA_IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      quality: "high",
      output_format: "png",
      n: 1
    });
  } catch (error) {
    if (NOVA_IMAGE_MODEL === NOVA_IMAGE_FALLBACK_MODEL) throw error;
    console.warn(`Nova image model ${NOVA_IMAGE_MODEL} failed, falling back to ${NOVA_IMAGE_FALLBACK_MODEL}`, error);
    return client.images.generate({
      model: NOVA_IMAGE_FALLBACK_MODEL,
      prompt,
      size: "1024x1024",
      quality: "high",
      output_format: "png",
      n: 1
    });
  }
}

async function addCmcLogoToImage(imageBuffer: Buffer) {
  const base = sharp(imageBuffer);
  const metadata = await base.metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || width;
  const logoSize = Math.round(width * 0.16);
  const margin = Math.round(width * 0.035);
  const logoPath = path.join(process.cwd(), "public", "brand", "cmc-logo.png");

  const circleMask = Buffer.from(
    `<svg width="${logoSize}" height="${logoSize}" viewBox="0 0 ${logoSize} ${logoSize}">
      <circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize / 2}" fill="white"/>
    </svg>`
  );

  const logo = await sharp(logoPath)
    .resize({ width: logoSize, height: logoSize, fit: "inside" })
    .ensureAlpha()
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const shadow = await sharp({
    create: {
      width: logoSize,
      height: logoSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${logoSize}" height="${logoSize}" viewBox="0 0 ${logoSize} ${logoSize}">
            <circle cx="${logoSize / 2}" cy="${logoSize / 2}" r="${logoSize * 0.46}" fill="rgba(0,0,0,0.32)"/>
          </svg>`
        )
      }
    ])
    .blur(Math.max(logoSize * 0.035, 4))
    .png()
    .toBuffer();

  const left = Math.max(width - logoSize - margin, margin);
  const top = Math.max(height - logoSize - margin, margin);

  return base
    .composite([
      {
        input: shadow,
        left,
        top
      },
      {
        input: logo,
        left,
        top
      }
    ])
    .png()
    .toBuffer();
}
