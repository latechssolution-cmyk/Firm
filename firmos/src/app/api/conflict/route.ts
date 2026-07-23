import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { findConflicts } from "@/lib/insights";

/** Live conflict-of-interest check for the new-case form (PRD CM-8). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user || user.role === "client") return NextResponse.json({ conflicts: [] }, { status: 401 });
  const plaintiff = req.nextUrl.searchParams.get("plaintiff") ?? "";
  const defendant = req.nextUrl.searchParams.get("defendant") ?? "";
  if (!plaintiff && !defendant) return NextResponse.json({ conflicts: [] });
  const db = await getDB();
  return NextResponse.json({ conflicts: findConflicts(db, plaintiff, defendant).slice(0, 5) });
}
