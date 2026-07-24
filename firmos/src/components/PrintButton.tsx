"use client";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-secondary">
      {label}
    </button>
  );
}
