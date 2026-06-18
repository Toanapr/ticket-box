import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";
import { UserAccountClient } from "@/components/user-account-client";

export default function UserPage(): React.ReactElement {
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Tài khoản" }]} />
      <UserAccountClient />
    </PageShell>
  );
}
