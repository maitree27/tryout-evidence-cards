import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { DeleteMyData } from "@/components/delete-my-data";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await getUser();
  const supabase = await createClient();
  const { data: athlete } = await supabase.from("athletes").select("name, batting_hand, coach_id").maybeSingle();
  if (!athlete) return null;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <h1 className="text-3xl">Profile</h1>

      <section className="glass flex items-center gap-4 p-4">
        <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-foreground/10 text-lg font-semibold">{athlete.name[0]?.toUpperCase()}</span>
        <div className="min-w-0">
          <div className="truncate font-medium">{athlete.name}</div>
          <div className="truncate text-sm text-muted">{athlete.batting_hand === "left" ? "Left-handed" : "Right-handed"} · {user?.email}</div>
        </div>
      </section>

      <section className="glass p-4">
        <div className="font-medium">{athlete.coach_id ? "Coached by your coach" : "Personal account"}</div>
        <p className="mt-1 text-sm text-muted">
          {athlete.coach_id ? "Your coach can see your clips, scores and any notes you're shown." : "Only you can see your clips and scores."}
        </p>
      </section>

      <section className="glass flex items-center justify-between p-4">
        <div>
          <div className="font-medium">Look</div>
          <div className="text-sm text-muted">Switch between dark and light</div>
        </div>
        <ThemeToggle />
      </section>

      <section className="glass divide-y divide-border">
        <Link href="/privacy" className="block p-4 hover:opacity-80">Privacy notice</Link>
        <form action={logout}>
          <button type="submit" className="block w-full p-4 text-left text-danger hover:opacity-80">Log out</button>
        </form>
      </section>

      {!athlete.coach_id && (
        <details className="glass p-4">
          <summary className="cursor-pointer text-sm text-muted">Delete my data</summary>
          <div className="mt-3"><DeleteMyData /></div>
        </details>
      )}
    </div>
  );
}
