import Link from "next/link";
import { BarChart3, BookOpen, CalendarDays, ClipboardList, FileClock, LayoutDashboard, LogOut, Shield, Users } from "lucide-react";
import { signOutAction } from "@/lib/actions/sign-out";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

type SidebarUser = { name?: string | null; role: "SUPER_ADMIN" | "STAFF" };

export function AppSidebar({ user }: { user: SidebarUser }) {
  const links = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/clients", "Clients", Users],
    ["/behaviors", "Behaviors", BookOpen],
    ["/logs", "Client Logs", ClipboardList],
    ["/weekly", "Weekly Summary", CalendarDays],
    ["/schedule", user.role === "SUPER_ADMIN" ? "HR & Staffing" : "My Schedule", CalendarDays],
    ...(user.role === "SUPER_ADMIN" ? [["/reports", "Staff Reports", BarChart3] as const] : []),
    ["/audit", "Audit Trail", FileClock],
    ...(user.role === "SUPER_ADMIN" ? [["/admin/users", "User Management", Shield] as const] : [])
  ] as const;

  return (
    <aside className="w-full border-b bg-white/95 p-4 shadow-xl shadow-primary/5 backdrop-blur md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
      <div className="mb-4 flex items-center justify-between gap-3 md:mb-6 md:block md:space-y-3">
        <BrandLogo />
        <div className="text-sm text-muted-foreground">{user.name}</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1">
        {links.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-1 hover:bg-muted hover:text-primary">
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <form action={signOutAction} className="mt-3 md:mt-8">
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </form>
    </aside>
  );
}
