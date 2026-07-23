"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="text-lg font-bold">Something went wrong</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        The page couldn&apos;t load. This is usually temporary — please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="themed mt-4 rounded-md px-4 py-2 text-sm font-semibold btn-primary"
      >
        Retry
      </button>
    </div>
  );
}
