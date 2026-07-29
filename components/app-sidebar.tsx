import Link from "next/link";
import { BookOpen, ClipboardList, FileClock, LayoutDashboard, LogOut, Shield, Users } from "lucide-react";
import { signOutAction } from "@/lib/actions/sign-out";
import { Button } from "@/components/ui/button";

type SidebarUser = { name?: string | null; role: "SUPER_ADMIN" | "STAFF" };

export function AppSidebar({ user }: { user: SidebarUser }) {
  const links = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/clients", "Clients", Users],
    ["/behaviors", "Behaviors", BookOpen],
    ["/logs", "Client Logs", ClipboardList],
    ["/audit", "Audit Trail", FileClock],
    ...(user.role === "SUPER_ADMIN" ? [["/admin/users", "User Management", Shield] as const] : [])
  ] as const;

  return (
    <aside className="hidden min-h-screen w-64 border-r bg-white p-4 md:block">
      <div className="mb-6">
        <div className="text-lg font-semibold">CBHS Logs</div>
        <div className="text-sm text-muted-foreground">{user.name}</div>
      </div>
      <nav className="space-y-1">
        {links.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted">
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <form action={signOutAction} className="mt-8">
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </form>
    </aside>
  );
}
