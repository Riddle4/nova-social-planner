import { NextResponse } from "next/server";
import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const status = body.status as PostStatus;
  const post = await prisma.post.update({ where: { id }, data: { status } });
  return NextResponse.json({ post });
}
