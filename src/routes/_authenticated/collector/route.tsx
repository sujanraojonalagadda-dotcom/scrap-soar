import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSessionRole } from "@/lib/services/roleService";

export const Route = createFileRoute("/_authenticated/collector")({
  beforeLoad: async ({ location }) => {
    const session = await getSessionRole();
    if (!session) throw redirect({ to: "/" });
    const isRegisterPage = location.pathname.startsWith("/collector/register");
    if (session.role === "admin") throw redirect({ to: "/admin/dashboard" });
    if (session.role === "recycler") throw redirect({ to: "/recycler/home" });
    if (session.role === null && !isRegisterPage) throw redirect({ to: "/collector/register" });
  },
  component: () => <Outlet />,
});
