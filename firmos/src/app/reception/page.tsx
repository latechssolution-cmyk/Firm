import { getDB } from "@/lib/db";
import { ReceptionChat } from "@/components/ReceptionChat";
import { ThemeToggle } from "@/lib/theme/ThemeToggle";
import { IconInquiries } from "@/components/icons";

export default async function ReceptionPage() {
  const db = await getDB();
  return (
    <main className="animate-in mx-auto max-w-lg p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--color-primary)", color: "var(--color-on-primary)", boxShadow: "var(--shadow-sm)" }}>
            <IconInquiries size={20} />
          </span>
          <div>
            <div className="font-display text-lg font-bold leading-tight">{db.firm.name}</div>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              AI Receptionist · 24/7 · English &amp; Urdu
            </div>
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
