import { Breadcrumbs } from "@/components/breadcrumbs";
import { OrderStatusClient } from "@/components/order-status-client";
import { PageShell } from "@/components/site-shell";
import { requireAuthUser } from "@/lib/require-auth-user";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  await requireAuthUser(`/orders/${id}`);

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Trạng thái đơn hàng" }]} />
      <OrderStatusClient orderId={id} />
    </PageShell>
  );
}
