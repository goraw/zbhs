import { redirect } from "next/navigation";
import { Shield, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createUser, updateUserAccess } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "SUPER_ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground">Super Admin controls staff access and reset requirements.</p>
      </div>

      <form action={createUser} className="grid gap-4 rounded-md border bg-white p-5 shadow-sm md:grid-cols-5">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" required />
        </div>
        <div>
          <Label htmlFor="password">Initial password</Label>
          <Input id="password" name="password" type="password" minLength={12} required />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue="STAFF">
            <option value="STAFF">Staff</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit">
            <UserPlus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Reset</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="p-3">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-muted-foreground">{user.username}</div>
                </td>
                <td className="p-3">{user.role === "SUPER_ADMIN" ? <span className="inline-flex items-center gap-1"><Shield className="h-4 w-4" />Super Admin</span> : "Staff"}</td>
                <td className="p-3">{user.isActive ? "Active" : "Disabled"}</td>
                <td className="p-3">{user.forcePasswordReset ? "Required" : "No"}</td>
                <td className="p-3">
                  <form action={updateUserAccess} className="flex flex-wrap gap-2">
                    <input type="hidden" name="userId" value={user.id} />
                    <Button variant="secondary" size="sm" name="intent" value={user.isActive ? "disable" : "enable"} type="submit">
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button variant="secondary" size="sm" name="intent" value="reset" type="submit">Force reset</Button>
                    <Button variant="destructive" size="sm" name="intent" value="delete" type="submit">Delete</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
