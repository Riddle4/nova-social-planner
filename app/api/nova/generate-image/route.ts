import { NextResponse } from "next/server";
import { getDefaultCompany } from "@/app/actions";
import { generateNovaImageAsset } from "@/lib/nova";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const company = await getDefaultCompany();
  const postId = typeof body.postId === "string" ? body.postId : null;
  let prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  let title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Image générée par Nova";
  let serviceId = typeof body.serviceId === "string" && body.serviceId ? body.serviceId : null;
  let eventId = typeof body.eventId === "string" && body.eventId ? body.eventId : null;

  const post = postId
    ? await prisma.post.findFirst({
        where: { id: postId, companyId: company.id },
        include: { service: true, event: true }
      })
    : null;

  if (post) {
    prompt =
      prompt ||
      post.generatedImagePrompt ||
      `Scène illustrée magique premium pour un post ${post.platform}. Objectif: ${post.objective || "engagement et conversion"}. Angle: ${post.marketingAngle || "clair, magique et professionnel"}. Sans texte, sans lettre, sans chiffre, sans enseigne.`;
    title = title === "Image générée par Nova" ? `Image IA - ${post.internalTitle}` : title;
    serviceId = serviceId || post.serviceId;
    eventId = eventId || post.eventId;
  }

  if (!prompt) {
    return NextResponse.json({ error: "Ajoutez un prompt d'image ou utilisez un post avec generatedImagePrompt." }, { status: 400 });
  }

  const generatedAssetData = await generateNovaImageAsset({
    prompt,
    companyId: company.id,
    title,
    serviceId,
    eventId
  });

  if (!generatedAssetData) {
    return NextResponse.json(
      {
        error:
          "Impossible de générer l'image. Vérifiez OPENAI_API_KEY et les droits du modèle image, ou réessayez avec un prompt plus simple."
      },
      { status: 502 }
    );
  }

  const mediaAsset = await prisma.mediaAsset.create({ data: generatedAssetData });
  if (post) {
    await prisma.post.update({
      where: { id: post.id },
      data: { mediaAssetId: mediaAsset.id, generatedImagePrompt: prompt }
    });
  }

  return NextResponse.json({
    mediaAsset,
    postUrl: post ? `/posts/${post.id}` : null
  });
}
