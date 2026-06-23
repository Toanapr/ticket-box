import { AuthFormClient } from "@/components/auth-form-client";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/site-shell";
import { safeNextPath } from "@/lib/require-auth-user";

export default async function RegisterPage({ searchParams }: { searchParams?: Promise<{ next?: string }> }): Promise<React.ReactElement> {
  const query = await searchParams;
  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Đăng ký" }]} />
      <AuthFormClient mode="register" nextPath={safeNextPath(query?.next)} />
    </PageShell>
  );
}
