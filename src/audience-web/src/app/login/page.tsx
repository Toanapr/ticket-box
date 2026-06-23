import { AuthFormClient } from "@/components/auth-form-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";
import { safeNextPath } from "@/lib/require-auth-user";

export default async function LoginPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }): Promise<React.ReactElement> {
  const query = await searchParams;
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Đăng nhập" }]} />
      <AuthFormClient mode="login" nextPath={safeNextPath(query?.next)} />
    </PageShell>
  );
}
