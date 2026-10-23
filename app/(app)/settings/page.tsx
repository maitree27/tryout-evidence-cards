import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { DemoButtons } from "@/components/demo-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadCoachRows } from "@/lib/coach-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function MorePage() {
  const user = await getUser();
  const supabase = await createClient();
  const { hasDemo, rows } = await loadCoachRows(supabase);
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email || "Coach";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <h1 className="text-3xl">More</h1>

      <section className="glass flex items-center gap-4 p-4">
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 text-lg font-semibold">{name[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <div className="truncate font-medium">{name}</div>
          <div className="truncate text-sm text-muted">Coach · {rows.length} student{rows.length === 1 ? "" : "s"}</div>
        </div>
      </section>

      <section className="glass flex items-center justify-between p-4">
        <div>
          <div className="font-medium">Look</div>
          <div className="text-sm text-muted">Switch between dark and light</div>
        </div>
        <ThemeToggle />
      </section>

      <section className="glass p-4">
        <div className="font-medium">Demo data</div>
        <p className="mb-3 mt-1 text-sm text-muted">Five sample students with weeks of made-up results, to see how Willow looks when it's full.</p>
        <DemoButtons hasDemo={hasDemo} />
      </section>

      <section className="glass divide-y divide-border">
        <Link href="/privacy" className="block p-4 hover:opacity-80">Privacy notice</Link>
        <form action={logout}>
          <button type="submit" className="block w-full p-4 text-left text-danger hover:opacity-80">Log out</button>
        </form>
      </section>
    </div>
  );
}
