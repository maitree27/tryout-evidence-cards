"use client";

import { useActionState } from "react";
import { createInvite, type InviteState } from "@/app/actions/invites";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function InviteAthlete({ athleteId }: { athleteId: string }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite.bind(null, athleteId), undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Student's email" hint="Only a login with exactly this email can accept the invite. Valid for 14 days.">
        <Input name="email" type="email" required autoComplete="off" />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-success">{state.ok}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invite link"}</Button>
    </form>
  );
}
