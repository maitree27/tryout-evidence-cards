import { createAthlete } from "@/app/actions/athletes";
import { AthleteForm } from "@/components/athlete-form";
import { Card } from "@/components/ui/card";

export default function NewAthletePage() {
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Add a student</h1>
      <Card>
        <AthleteForm action={createAthlete} submitLabel="Add student" />
      </Card>
    </div>
  );
}
