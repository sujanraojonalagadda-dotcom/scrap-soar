import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, LogOut, Recycle, ShieldCheck, Users, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/services/authService";

const navigation = [
  { to: "/admin/dashboard" as const, label: "Dashboard", icon: BarChart3 },
  { to: "/admin/collectors" as const, label: "Collectors", icon: Users },
  { to: "/admin/recyclers" as const, label: "Recyclers", icon: Warehouse },
  { to: "/admin/transactions" as const, label: "Transactions", icon: ShieldCheck },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  async function logout() {
    await signOut();
    navigate({ to: "/" });
  }
  return (
    <div className="min-h-screen bg-muted md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border bg-brand-dark text-primary-foreground md:min-h-screen md:border-b-0 md:border-r">
        <div className="flex h-16 items-center gap-2 px-4 font-bold"><Recycle className="size-5" /> KABADIWALA</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0" aria-label="Admin navigation">
          {navigation.map((item) => (
            <Link key={item.to} to={item.to} activeProps={{ className: "bg-primary text-primary-foreground" }} inactiveProps={{ className: "text-primary-foreground/80" }} className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium">
              <item.icon className="size-4" aria-hidden /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-3 md:absolute md:bottom-3 md:w-[220px]">
          <Button variant="outline" className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary/20 hover:text-primary-foreground" onClick={logout}>
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}