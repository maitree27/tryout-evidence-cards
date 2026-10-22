import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold">🏏 Batting Coach</Link>
          <nav className="flex items-center gap-2">
            <Link href="/athletes/new" className="rounded-ui px-3 py-2 text-sm hover:bg-black/5">Add student</Link>
            <form action={logout}>
              <Button variant="ghost" type="submit">Log out</Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
