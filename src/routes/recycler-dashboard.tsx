import { createFileRoute, redirect } from "@tanstack/react-router";
import { dashboardPathForRole, getSessionRole } from "@/lib/services/roleService";

export const Route = createFileRoute("/recycler-dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const session = await getSessionRole();
    if (!session) throw redirect({ to: "/" });
    if (!session.role) throw redirect({ to: "/collector/register" });
    throw redirect({ to: dashboardPathForRole[session.role] });
  },
  component: () => null,
});
