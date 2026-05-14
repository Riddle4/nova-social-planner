import * as React from "react";
import { cn } from "@/lib/utils";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-slate-800 bg-slate-950/70 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400",
        props.className
      )}
    />
  );
}
