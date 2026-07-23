import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDB } from "./db";
import type { Role, User } from "./db/types";

const COOKIE = "firmos-session";

export function currentUser(): User | null {
  const c = cookies().get(COOKIE)?.value;
  if (!c) return null;
  return getDB().users.find((u) => u.id === c) ?? null;
}

export function requireUser(roles?: Role[]): User {
  const u = currentUser();
  if (!u) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect(u.role === "client" ? "/portal" : "/dashboard");
  return u;
}

export const SESSION_COOKIE = COOKIE;

/** Capability check: munshi sees fees only if granted (demo: granted=false). */
export function canSeeFees(u: User) {
  return u.role === "admin" || u.role === "associate";
}
