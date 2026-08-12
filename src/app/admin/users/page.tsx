import { listUsers } from "@/lib/repos/admin";
import { Badge, Card, EmptyState } from "@/components/ui";

const roleTone = {
  candidate: "brand",
  employer: "amber",
  admin: "slate",
} as const;

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <>
      <h1 className="mb-1 text-xl font-bold">Users</h1>
      <p className="mb-5 text-sm text-muted">{users.length} total</p>

      {users.length === 0 ? (
        <EmptyState icon="👤" title="No users yet" />
      ) : (
        <Card className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.uid} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {u.displayName || u.email || u.phone || u.uid}
                </p>
                <p className="truncate text-xs text-muted">
                  {u.email ?? "no email"} · {u.phone ?? "no phone"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.role ? (
                  <Badge tone={roleTone[u.role]}>{u.role}</Badge>
                ) : (
                  <Badge tone="slate">no role</Badge>
                )}
                {!u.onboardingComplete && <Badge tone="amber">onboarding</Badge>}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
