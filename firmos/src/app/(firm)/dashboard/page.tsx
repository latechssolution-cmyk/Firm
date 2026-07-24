import { getDB } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { buildDashboard } from "@/lib/dashboard";
import { DashboardLive } from "@/components/DashboardLive";

export default async function Dashboard() {
  const user = await requireUser(["admin", "associate", "clerk"]);
  const db = await getDB();
  // Server-render the first frame from live data; the client then polls for updates.
  const initial = buildDashboard(db, user);
  return <DashboardLive initial={initial} />;
}
