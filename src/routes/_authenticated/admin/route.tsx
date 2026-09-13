import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin } from "@/lib/services/adminService";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user || !(await isCurrentUserAdmin(data.user.id))) throw redirect({ to: "/collector/home" });
  },
  component: () => <AdminShell><Outlet /></AdminShell>,
});