import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getRole, getUser } from "@/lib/supabase/server";

// Everything under /me is the athlete's own area. Row-level security does the real protection; this keeps coaches out of the wrong screens.
export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  if ((await getRole()) !== "athlete") redirect("/");
  return (
    <div className="min-h-screen">
      <header className="bg-foreground text-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/me" className="font-display text-3xl tracking-wide">WILLOW</Link>
          <nav className="flex items-center gap-1">
            <Link href="/me/progress" className="px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/15">Progress</Link>
            <Link href="/me/upload" className="px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider hover:bg-white/15">Upload</Link>
            <form action={logout}>
              <Button variant="ghost" type="submit" className="hover:bg-white/15">Log out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">{children}</main>
    </div>
  );
}
