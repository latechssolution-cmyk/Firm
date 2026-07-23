import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default function Home() {
  const u = currentUser();
  if (!u) redirect("/login");
  redirect(u.role === "client" ? "/portal" : "/dashboard");
}
