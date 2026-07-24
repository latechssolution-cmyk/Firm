import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json([], { status: 401 });
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase().trim();
  if (!q) return NextResponse.json([]);
  const db = await getDB();
  const hits: { href: string; title: string; sub: string; kind: string }[] = [];

  for (const c of db.cases) {
    const hay = `${c.number} ${c.title} ${c.parties.plaintiff} ${c.parties.defendant} ${c.stage}`.toLowerCase();
    if (hay.includes(q)) hits.push({ href: `/cases/${c.id}`, title: c.title, sub: c.number, kind: "Case" });
    if (hits.length > 8) break;
  }
  for (const cl of db.clients) {
    if (`${cl.name} ${cl.cnic ?? ""} ${cl.phone}`.toLowerCase().includes(q))
      hits.push({ href: `/clients`, title: cl.name, sub: cl.phone, kind: "Client" });
    if (hits.length > 12) break;
  }
  for (const d of db.documents) {
    // Includes OCR-extracted text so uploaded scans are full-text searchable.
    if (`${d.title} ${d.body ?? ""} ${d.ocrText ?? ""}`.toLowerCase().includes(q))
      hits.push({ href: `/documents/${d.id}`, title: d.title, sub: d.ocrText && d.body === undefined ? "scan · OCR" : d.status, kind: "Document" });
    if (hits.length > 15) break;
  }
  return NextResponse.json(hits.slice(0, 15));
}
