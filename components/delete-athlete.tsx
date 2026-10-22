"use client";

import { useActionState } from "react";
import { deleteAthlete, type FormState } from "@/app/actions/athletes";
import { Button } from "@/components/ui/button";

export function DeleteAthlete({ athleteId, name }: { athleteId: string; name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAthlete.bind(null, athleteId), undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">
        Permanently delete {name}: their record, every video and video file, scores, notes, invites and consent record. This cannot be undone.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" /> I understand this is permanent
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" variant="danger" disabled={pending}>{pending ? "Deleting…" : `Delete ${name} permanently`}</Button>
    </form>
  );
}
