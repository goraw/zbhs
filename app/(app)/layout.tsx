import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { IdleLogout } from "@/components/idle-logout";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={user} />
      <main className="flex-1 p-4 md:p-8">
        <IdleLogout />
        <div className="app-page-shell mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
