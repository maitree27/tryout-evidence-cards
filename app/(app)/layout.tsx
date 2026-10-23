import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-header";
import { getRole, getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  // Coach screens are for coaches only; students have their own area.
  if ((await getRole()) === "athlete") redirect("/me");
  return (
    <AppShell role="coach" homeHref="/dashboard">
      {children}
    </AppShell>
  );
}
