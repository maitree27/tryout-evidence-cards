"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import type { FormState } from "@/app/actions/athletes";

export type AthleteValues = {
  name?: string;
  batting_hand?: "right" | "left";
  date_of_birth?: string | null;
  is_minor?: boolean;
  notes?: string | null;
};

export function AthleteForm({
  action,
  initial = {},
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initial?: AthleteValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <Field label="Student name">
        <Input name="name" required defaultValue={initial.name} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batting hand" hint="Used to work out which foot is the front foot.">
          <Select name="batting_hand" defaultValue={initial.batting_hand ?? "right"}>
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </Select>
        </Field>
        <Field label="Date of birth (optional)">
          <Input name="date_of_birth" type="date" defaultValue={initial.date_of_birth ?? ""} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_minor" defaultChecked={initial.is_minor ?? true} />
        This student is under 18 (videos stay private to you either way)
      </label>
      <Field label="Notes (optional)">
        <Textarea name="notes" defaultValue={initial.notes ?? ""} />
      </Field>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
