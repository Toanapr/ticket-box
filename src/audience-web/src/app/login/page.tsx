import { AuthFormClient } from "@/components/auth-form-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";

export default function LoginPage(): React.ReactElement {
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Đăng nhập" }]} />
      <AuthFormClient mode="login" />
    </PageShell>
  );
}
