import { getDB } from "@/lib/db";
import { ReceptionChat } from "@/components/ReceptionChat";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";

export default function ReceptionPage() {
  const db = getDB();
  return (
    <main className="mx-auto max-w-lg p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-bold">{db.firm.name}</div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            AI Receptionist · 24/7 · answers in English &amp; Urdu · no legal advice
          </div>
        </div>
        <ThemeToggle />
      </div>
      <ReceptionChat />
      <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
        Every conversation creates an inquiry in the firm dashboard; urgent matters are flagged and forwarded immediately.
      </p>
    </main>
  );
}
