import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";
import { UserAccountClient } from "@/components/user-account-client";
import { requireAuthUser } from "@/lib/require-auth-user";

export default async function UserPage(): Promise<React.ReactElement> {
  await requireAuthUser("/user");
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Tài khoản" }]} />
      <UserAccountClient />
    </PageShell>
  );
}
