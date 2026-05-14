import { redirect } from "next/navigation";
import { login } from "@/app/login/actions";
import { isAuthConfigured } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;
  if (!isAuthConfigured() && process.env.NODE_ENV === "production") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-5 overflow-hidden rounded-lg border border-cyan-300/30 bg-slate-950">
            <img src="/agents/nova.png" alt="Nova" className="aspect-square w-full object-cover" />
          </div>
          <CardTitle className="text-2xl">Accès Nova</CardTitle>
          <p className="mt-2 text-sm text-slate-400">Entrez le mot de passe pour accéder à Nova Social Planner.</p>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            <input type="hidden" name="next" value={params.next || "/dashboard"} />
            <div className="field">
              <label>Mot de passe</label>
              <Input name="password" type="password" autoComplete="current-password" required autoFocus />
            </div>
            {params.error ? <p className="text-sm text-red-200">Mot de passe incorrect.</p> : null}
            <Button className="w-full">Se connecter</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
