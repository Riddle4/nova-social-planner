import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.update({
    where: { id },
    data: { status: "READY_FOR_META", metaExportedAt: new Date() }
  });
  if (post.mediaAssetId) {
    await prisma.mediaAsset.update({
      where: { id: post.mediaAssetId },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() }
    });
  }
  return NextResponse.json({ post });
}
