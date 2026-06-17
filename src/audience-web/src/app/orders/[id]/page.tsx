import { Breadcrumbs } from "@/components/breadcrumbs";
import { OrderStatusClient } from "@/components/order-status-client";
import { PageShell } from "@/components/site-shell";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderPage({ params }: OrderPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <PageShell>
      <Breadcrumbs items={[{ label: "Concerts", href: "/concerts" }, { label: "Trang thai don hang" }]} />
      <OrderStatusClient orderId={id} />
    </PageShell>
  );
}
