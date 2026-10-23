import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getRole, getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  // Coach screens are for coaches only; athletes have their own area.
  if ((await getRole()) === "athlete") redirect("/me");
  return (
    <div className="min-h-screen">
      <header className="bg-foreground text-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="font-display text-3xl tracking-wide">WILLOW</Link>
          <nav className="flex items-center gap-2">
            <Link href="/athletes/new" className="px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/15">Add student</Link>
            <form action={logout}>
              <Button variant="ghost" type="submit" className="font-mono text-xs uppercase tracking-wider hover:bg-white/15">Log out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
