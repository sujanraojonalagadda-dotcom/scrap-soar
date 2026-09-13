import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionRole } from "@/lib/services/roleService";

export const Route = createFileRoute("/_authenticated/recycler")({
  beforeLoad: async () => {
    const session = await getSessionRole();
    if (!session) throw redirect({ to: "/" });
    if (session.role === "admin") throw redirect({ to: "/admin/dashboard" });
    if (session.role === "collector") throw redirect({ to: "/collector/home" });
    if (session.role === null) throw redirect({ to: "/collector/register" });
  },
  component: () => <Outlet />,
});
