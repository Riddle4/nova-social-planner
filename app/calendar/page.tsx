import Link from "next/link";
import { addDays, addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getDefaultCompany } from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseMonth } from "@/lib/monthly-posts";
import { prisma } from "@/lib/prisma";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const company = await getDefaultCompany();
  const selectedMonth = params.month || new Date().toISOString().slice(0, 7);
  const parsedMonth = parseMonth(selectedMonth);
  const now = parsedMonth ? new Date(parsedMonth.year, parsedMonth.monthIndex, 1, 12) : new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const posts = await prisma.post.findMany({
    where: { companyId: company.id, recommendedDate: { gte: start, lte: end }, status: { not: "ARCHIVED" } },
    orderBy: [{ recommendedDate: "asc" }, { recommendedTime: "asc" }]
  });

  const blanks = (getDay(start) + 6) % 7;
  const days = Array.from({ length: end.getDate() }, (_, index) => addDays(start, index));
  const previousMonth = format(addMonths(now, -1), "yyyy-MM");
  const nextMonth = format(addMonths(now, 1), "yyyy-MM");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-semibold text-white">Calendrier éditorial</h1><p className="mt-2 text-slate-400">{format(now, "MMMM yyyy", { locale: fr })}</p></div>
        <form className="flex items-end gap-2">
          <Button asChild variant="outline" size="icon">
            <Link href={`/calendar?month=${previousMonth}`} aria-label="Mois précédent">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="field">
            <label>Mois</label>
            <Input type="month" name="month" defaultValue={selectedMonth} />
          </div>
          <Button variant="outline">Afficher</Button>
          <Button asChild variant="outline" size="icon">
            <Link href={`/calendar?month=${nextMonth}`} aria-label="Mois suivant">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </form>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-300">
        <span className="rounded-full bg-slate-900 px-3 py-1">Post avec image</span>
        <span className="rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-amber-100">Image à ajouter ou générer</span>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase text-slate-500">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: blanks }).map((_, index) => <div key={index} />)}
        {days.map((day) => {
          const dayPosts = posts.filter((post) => post.recommendedDate?.toDateString() === day.toDateString());
          return (
            <Card key={day.toISOString()} className="min-h-36 p-3">
              <p className="mb-3 text-sm font-medium text-white">{format(day, "d")}</p>
              <div className="space-y-2">
                {dayPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className={
                      post.mediaAssetId
                        ? "block rounded-md bg-slate-900 p-2 text-xs hover:bg-slate-800"
                        : "block rounded-md border border-amber-400/40 bg-amber-400/15 p-2 text-xs text-amber-50 hover:bg-amber-400/20"
                    }
                  >
                    <span className="line-clamp-2 text-slate-100">{post.internalTitle}</span>
                    {!post.mediaAssetId ? <span className="mt-1 block text-[10px] uppercase tracking-wide text-amber-200">Image à créer</span> : null}
                    <StatusBadge status={post.status} className="mt-2 inline-block scale-90" />
                  </Link>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <Card className="p-4">
        <h2 className="mb-3 text-lg font-semibold text-white">Vue liste</h2>
        <div className="space-y-2">
          {posts.map((post) => (
            <Link key={post.id} href={`/posts/${post.id}`} className={`flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 hover:bg-slate-900 ${post.mediaAssetId ? "border-slate-800" : "border-amber-400/40 bg-amber-400/10"}`}>
              <span>{post.recommendedDate?.toLocaleDateString("fr-CH")} · {post.internalTitle}{post.mediaAssetId ? "" : " · Image à créer"}</span>
              <StatusBadge status={post.status} />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
