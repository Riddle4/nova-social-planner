import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import { getDefaultCompany } from "@/app/actions";
import { getMetaConfigurationIssues, schedulePostToMeta } from "@/lib/meta";
import { parseMonth } from "@/lib/monthly-posts";
import { prisma } from "@/lib/prisma";

const ELIGIBLE_STATUSES = ["VALIDATED", "READY_FOR_META", "TO_VALIDATE"] as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const month = typeof body.month === "string" ? body.month : "";
  const parsedMonth = parseMonth(month);
  if (!parsedMonth) {
    return NextResponse.json({ error: "Le mois doit être au format YYYY-MM." }, { status: 400 });
  }

  const company = await getDefaultCompany();
  const configurationIssues = getMetaConfigurationIssues(company);
  if (configurationIssues.length) {
    return NextResponse.json(
      {
        error: "Configuration Meta incomplète.",
        issues: configurationIssues
      },
      { status: 400 }
    );
  }

  const reference = new Date(parsedMonth.year, parsedMonth.monthIndex, 1, 12);
  const posts = await prisma.post.findMany({
    where: {
      companyId: company.id,
      recommendedDate: { gte: startOfMonth(reference), lte: endOfMonth(reference) },
      status: { in: [...ELIGIBLE_STATUSES] }
    },
    include: { mediaAsset: true },
    orderBy: [{ recommendedDate: "asc" }, { recommendedTime: "asc" }]
  });

  const results = [];
  for (const post of posts) {
    const result = await schedulePostToMeta(company, post);
    if (result.ok) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "API_SCHEDULED",
          metaExportedAt: new Date(),
          metaFacebookPostId: result.facebookPostId || post.metaFacebookPostId,
          metaInstagramPostId: result.instagramPostId || post.metaInstagramPostId,
          publicationError: result.error || null
        }
      });
    } else {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "PUBLICATION_ERROR",
          publicationError: result.error || "Erreur inconnue pendant la programmation Meta."
        }
      });
    }

    results.push({
      id: post.id,
      title: post.internalTitle,
      ok: result.ok,
      facebookPostId: result.facebookPostId,
      instagramPostId: result.instagramPostId,
      error: result.error
    });
  }

  return NextResponse.json({
    month,
    attempted: posts.length,
    scheduled: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results
  });
}
