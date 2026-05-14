import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parseTags, toNullableString } from "@/lib/utils";

function safeFilename(filename: string) {
  return `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
}

async function getPost(id: string) {
  return prisma.post.findUnique({
    where: { id },
    select: { id: true, companyId: true, serviceId: true, eventId: true }
  });
}

function revalidatePostViews(id: string) {
  revalidatePath("/posts");
  revalidatePath(`/posts/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/media");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Post introuvable." }, { status: 404 });

  const body = await request.json();
  const mediaAssetId = typeof body.mediaAssetId === "string" && body.mediaAssetId.trim() ? body.mediaAssetId : null;

  if (mediaAssetId) {
    const asset = await prisma.mediaAsset.findFirst({
      where: { id: mediaAssetId, companyId: post.companyId },
      select: { id: true }
    });
    if (!asset) return NextResponse.json({ error: "Média introuvable." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.post.update({
      where: { id },
      data: { mediaAssetId }
    }),
    ...(mediaAssetId
      ? [
          prisma.mediaAsset.update({
            where: { id: mediaAssetId },
            data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
          })
        ]
      : [])
  ]);
  revalidatePostViews(id);

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return NextResponse.json({ error: "Post introuvable." }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Image manquante." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filename = safeFilename(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);

  const asset = await prisma.mediaAsset.create({
    data: {
      companyId: post.companyId,
      serviceId: post.serviceId,
      eventId: post.eventId,
      url: `/uploads/${filename}`,
      filename: file.name,
      type: file.type || "application/octet-stream",
      title: toNullableString(formData.get("title")) || file.name,
      description: toNullableString(formData.get("description")),
      tags: parseTags(formData.get("tags")),
      source: "EXTERNAL",
      usageCount: 1,
      lastUsedAt: new Date()
    }
  });

  await prisma.post.update({
    where: { id },
    data: { mediaAssetId: asset.id }
  });
  revalidatePostViews(id);

  return NextResponse.json({ ok: true, asset });
}
