import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Images, LayoutDashboard, ListChecks, Wand2, Briefcase, PartyPopper } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova",
  description: "Agent IA community manager connecté à Cosmo AI."
};

export const dynamic = "force-dynamic";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendrier", icon: CalendarDays },
  { href: "/posts", label: "Posts", icon: ListChecks },
  { href: "/services", label: "Services", icon: Briefcase },
  { href: "/events", label: "Événements", icon: PartyPopper },
  { href: "/media", label: "Médias", icon: Images },
  { href: "/nova", label: "Nova Studio", icon: Wand2 }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body>
        <div className="flex min-h-screen">
          <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-slate-950/55 px-5 py-6 backdrop-blur xl:block">
            <Link href="/dashboard" className="mb-6 block">
              <span className="block">
                <span className="block text-2xl font-semibold leading-tight text-white">Nova</span>
                <span className="text-xs text-cyan-200">Powered by Cosmo AI</span>
              </span>
              <span className="mt-5 block overflow-hidden rounded-lg border border-cyan-300/30 bg-slate-950 shadow-glow">
                <img src="/agents/nova.png" alt="Nova" className="aspect-square w-full object-cover" />
              </span>
            </Link>
            <nav className="space-y-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-8 rounded-lg border border-violet-400/20 bg-violet-400/10 p-4 text-sm text-slate-200">
              <p className="font-medium text-violet-100">Meta API ready</p>
              <p className="mt-2 text-slate-400">
                Connecteur, IDs de comptes et statuts API sont prévus pour la prochaine étape.
              </p>
            </div>
          </aside>
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-8 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
