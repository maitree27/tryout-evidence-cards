"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { login, signup, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  return (
    <form action={action} className="space-y-4">
      {mode === "signup" && (
        <Field label="Your name">
          <Input name="name" required autoComplete="name" />
        </Field>
      )}
      <Field label="Email">
        <Input name="email" type="email" required autoComplete="email" />
      </Field>
      <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
        <Input name="password" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "login" ? "Log in" : "Create coach account"}
      </Button>
      <p className="text-center text-sm text-muted">
        {mode === "login" ? (
          <>No account? <Link href="/signup" className="text-primary underline">Sign up</Link></>
        ) : (
          <>Have an account? <Link href="/login" className="text-primary underline">Log in</Link></>
        )}
      </p>
    </form>
  );
}
