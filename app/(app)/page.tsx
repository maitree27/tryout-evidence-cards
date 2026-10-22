import Link from "next/link";
import { Badge, Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function RosterPage() {
  const supabase = await createClient();
  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, name, batting_hand, archived")
    .order("name");
  const active = (athletes ?? []).filter((a) => !a.archived);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your students</h1>
        <Link href="/athletes/new" className="rounded-ui bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Add student
        </Link>
      </div>
      {active.length === 0 ? (
        <Card className="text-center text-sm text-muted">No students yet. Add your first one to get started.</Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((a) => (
            <li key={a.id}>
              <Link href={`/athletes/${a.id}`}>
                <Card className="flex items-center justify-between hover:border-primary">
                  <span className="font-medium">{a.name}</span>
                  <Badge>{a.batting_hand}-handed</Badge>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
