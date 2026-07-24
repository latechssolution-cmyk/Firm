/** Shimmer skeleton shown while a firm page's data loads. */
export default function Loading() {
  return (
    <div className="animate-in">
      <div className="mb-6 flex items-center justify-between">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-9 w-64 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="themed rounded-2xl border p-5" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-surface)" }}>
            <div className="skeleton mb-3 h-3 w-24" />
            <div className="skeleton h-7 w-20" />
            <div className="skeleton mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="themed rounded-2xl border p-5 lg:col-span-2" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-surface)" }}>
          <div className="skeleton mb-4 h-4 w-40" />
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
          </div>
        </div>
        <div className="themed rounded-2xl border p-5" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-surface)" }}>
          <div className="skeleton mb-4 h-4 w-32" />
          <div className="mx-auto skeleton h-32 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
