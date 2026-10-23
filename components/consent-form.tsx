"use client";

import Link from "next/link";
import { useActionState } from "react";
import { recordConsent, type ConsentState } from "@/app/actions/consent";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function ConsentForm({ studentName, isMinor }: { studentName: string; isMinor: boolean }) {
  const [state, action, pending] = useActionState<ConsentState, FormData>(recordConsent, undefined);
  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Who is accepting?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="role" value="parent_guardian" defaultChecked={isMinor} required className="mt-1" />
          <span>I am the parent or legal guardian of {studentName}</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="radio" name="role" value="self_adult" defaultChecked={!isMinor} className="mt-1" />
          <span>I am {studentName}, and I am 18 or over</span>
        </label>
      </fieldset>
      <Field label="Your full name">
        <Input name="name" required autoComplete="name" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" className="mt-1" />
        <span>
          I have read the <Link href="/privacy" target="_blank" className="underline underline-offset-4">privacy notice</Link> and agree to the videos, scores and notes for {studentName} being stored and processed as described.
        </span>
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Accept and continue"}</Button>
    </form>
  );
}
