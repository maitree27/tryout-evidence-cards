"use client";

import Link from "next/link";
import { useActionState } from "react";
import { joinWithInvite, type InviteState } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function JoinForm({ token, mode, defaultName }: { token: string; mode: "signup" | "login" | "accept"; defaultName?: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(joinWithInvite.bind(null, token, mode), undefined);
  return (
    <form action={action} className="space-y-4">
      {mode === "signup" && (
        <Field label="Your name">
          <Input name="name" required defaultValue={defaultName} autoComplete="name" />
        </Field>
      )}
      {mode !== "accept" && (
        <>
          <Field label="Email" hint="Use the email your coach sent this invite to.">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
            <Input name="password" type="password" required autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          </Field>
        </>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : mode === "accept" ? "Accept invite" : mode === "signup" ? "Create my account" : "Log in and join"}
      </Button>
      {mode !== "accept" && (
        <p className="text-center text-sm text-muted">
          {mode === "signup" ? (
            <>Already have an account? <Link href="?mode=login" className="text-primary underline">Log in</Link></>
          ) : (
            <>New here? <Link href="?" className="text-primary underline">Create an account</Link></>
          )}
        </p>
      )}
    </form>
  );
}
