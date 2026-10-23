"use client";

import Link from "next/link";
import { useActionState } from "react";
import { completeProfile, studentSignup, type IndependentState } from "@/app/actions/independent";
import { ProfileFields } from "@/components/profile-fields";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function StudentSignupForm({ mode, defaultName }: { mode: "signup" | "complete"; defaultName?: string }) {
  const [state, action, pending] = useActionState<IndependentState, FormData>(mode === "signup" ? studentSignup : completeProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <ProfileFields defaultName={defaultName} />
      {mode === "signup" && (
        <>
          <Field label="Email">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters">
            <Input name="password" type="password" required autoComplete="new-password" />
          </Field>
        </>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.notice && <p className="text-sm text-primary">{state.notice}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "signup" ? "Create my account" : "Finish my profile"}
      </Button>
      {mode === "signup" && (
        <p className="text-center text-sm text-muted">
          Already have an account? <Link href="/login?as=student" className="text-primary underline">Student log in</Link>
        </p>
      )}
    </form>
  );
}
