export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-5 h-6 w-48 rounded" style={{ background: "var(--color-muted-bg)" }} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg" style={{ background: "var(--color-muted-bg)" }} />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-lg" style={{ background: "var(--color-muted-bg)" }} />
    </div>
  );
}
