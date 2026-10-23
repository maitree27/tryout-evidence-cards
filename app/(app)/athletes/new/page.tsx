import { createAthlete } from "@/app/actions/athletes";
import { AthleteForm } from "@/components/athlete-form";
import { Card } from "@/components/ui/card";

export default function NewAthletePage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-5 pt-6">
      <h1 className="text-3xl">Add a student</h1>
      <Card>
        <AthleteForm action={createAthlete} submitLabel="Add student" />
      </Card>
    </div>
  );
}
