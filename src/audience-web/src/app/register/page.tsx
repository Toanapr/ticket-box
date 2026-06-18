import { AuthFormClient } from "@/components/auth-form-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";

export default function RegisterPage(): React.ReactElement {
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Đăng ký" }]} />
      <AuthFormClient mode="register" />
    </PageShell>
  );
}
