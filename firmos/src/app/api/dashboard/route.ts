import { NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { buildDashboard } from "@/lib/dashboard";

/** Live dashboard data — polled by the client for real-time updates. */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await getDB();
  return NextResponse.json(buildDashboard(db, user), {
    headers: { "Cache-Control": "no-store" },
  });
}
