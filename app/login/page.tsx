import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="text-sm text-muted">Cricket batting analysis for coaches.</p>
      <Card>
        <AuthForm mode="login" />
      </Card>
    </main>
  );
}
