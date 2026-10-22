import { Suspense } from "react";
import { notFound } from "next/navigation";
import { loadReport } from "@/lib/storage";
import ComparisonTable from "@/components/ComparisonTable";
import EvidenceCard from "@/components/EvidenceCard";

export const metadata = { title: "Selector report" };

async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadReport(id);
  if (!report) notFound();

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold">Tryout evidence report</h1>
        <p className="text-sm text-gray-600">
          Created {new Date(report.createdAt).toLocaleString()}. AI-assisted observations from short clips, not final
          judgements. Anyone with this link can view it.
        </p>
      </header>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Comparison</h2>
        <ComparisonTable cards={report.cards} />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Evidence cards</h2>
        {report.cards.map((c) => (
          <EvidenceCard key={c.id} card={c} />
        ))}
      </section>
    </>
  );
}

export default function SelectorPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <Suspense fallback={<p>Loading report…</p>}>
        <Report params={params} />
      </Suspense>
    </main>
  );
}
