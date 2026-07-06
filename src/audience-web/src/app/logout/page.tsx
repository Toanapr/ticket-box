import { Breadcrumbs } from "@/components/breadcrumbs";
import { LogoutClient } from "@/components/logout-client";
import { PageShell } from "@/components/site-shell";

export default function LogoutPage(): React.ReactElement {
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Đăng xuất" }]} />
      <LogoutClient />
    </PageShell>
  );
}
