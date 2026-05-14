import { PostStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const styles: Record<PostStatus, string> = {
  IDEA: "bg-slate-700 text-slate-100",
  AI_DRAFT: "bg-violet-500/20 text-violet-200",
  TO_VALIDATE: "bg-amber-500/20 text-amber-200",
  VALIDATED: "bg-blue-500/20 text-blue-200",
  READY_FOR_META: "bg-cyan-500/20 text-cyan-200",
  EXPORTED_TO_META: "bg-indigo-500/20 text-indigo-200",
  MANUALLY_SCHEDULED: "bg-emerald-500/20 text-emerald-200",
  API_SCHEDULED: "bg-teal-500/20 text-teal-200",
  PUBLISHED: "bg-green-500/20 text-green-200",
  PUBLICATION_ERROR: "bg-red-500/20 text-red-200",
  ARCHIVED: "bg-zinc-700 text-zinc-300"
};

export function StatusBadge({ status, className }: { status: PostStatus; className?: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", styles[status], className)}>
      {status}
    </span>
  );
}
