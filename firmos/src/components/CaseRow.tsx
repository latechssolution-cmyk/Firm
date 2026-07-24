"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** A table row whose whole surface opens the case on click. Clicks inside the
 *  actions cell are stopped so Edit/Delete keep working; the title stays a real
 *  <Link> for keyboard access. */
export function CaseRow({ href, children, actions }: { href: string; children: ReactNode; actions: ReactNode }) {
  const router = useRouter();
  return (
    <tr className="row-link" onClick={() => router.push(href)}>
      {children}
      <td onClick={(e) => e.stopPropagation()}>{actions}</td>
    </tr>
  );
}
