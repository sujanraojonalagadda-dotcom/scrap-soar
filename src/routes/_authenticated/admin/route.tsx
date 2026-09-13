import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionRole } from "@/lib/services/roleService";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const session = await getSessionRole();
    if (!session) throw redirect({ to: "/" });
    if (session.role === "recycler") throw redirect({ to: "/recycler/home" });
    if (session.role === "collector") throw redirect({ to: "/collector/home" });
    if (session.role === null) throw redirect({ to: "/collector/register" });
  },
  component: () => <AdminShell><Outlet /></AdminShell>,
});
