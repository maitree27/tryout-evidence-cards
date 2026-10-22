import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <h1 className="text-4xl">Create your coach account</h1>
      <p className="text-sm text-muted">Willow: cricket batting analysis for coaches.</p>
      <Card>
        <AuthForm mode="signup" />
      </Card>
    </main>
  );
}
