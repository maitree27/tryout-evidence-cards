"use client";

import { useActionState } from "react";
import { deleteMyData, type IndependentState } from "@/app/actions/independent";
import { Button } from "@/components/ui/button";

export function DeleteMyData() {
  const [state, action, pending] = useActionState<IndependentState, FormData>(deleteMyData, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted">
        Permanently delete your profile, every clip and video file, your scores and your consent record. Your login stays so you can start again. This cannot be undone.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" /> I understand this is permanent
      </label>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" variant="danger" disabled={pending}>{pending ? "Deleting…" : "Delete all my data"}</Button>
    </form>
  );
}
