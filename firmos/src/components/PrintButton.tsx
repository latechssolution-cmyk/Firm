"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="themed rounded-md px-4 py-2 text-sm font-semibold btn-secondary">
      Print / Save as PDF
    </button>
  );
}
