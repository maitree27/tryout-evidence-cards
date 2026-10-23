import Link from "next/link";
import { Field, Input, Select } from "@/components/ui/form";

/** Shared by the sign-up page and the "finish your profile" screen. */
export function ProfileFields({ defaultName }: { defaultName?: string }) {
  return (
    <>
      <Field label="Your full name">
        <Input name="name" required defaultValue={defaultName} autoComplete="name" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Batting hand">
          <Select name="batting_hand" defaultValue="right">
            <option value="right">Right-handed</option>
            <option value="left">Left-handed</option>
          </Select>
        </Field>
        <Field label="Date of birth" hint="You must be 18 or over to sign up without a coach.">
          <Input name="dob" type="date" required autoComplete="bday" />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="agree" className="mt-1" />
        <span>
          I am 18 or over, and I have read the{" "}
          <Link href="/privacy" target="_blank" className="underline underline-offset-4">privacy notice</Link> and agree to my videos and scores being stored as described.
        </span>
      </label>
    </>
  );
}
