"use client";

import { useMemo, useSyncExternalStore } from "react";
import { CreditCardIcon, TicketIcon, UsersIcon } from "./icons";
import { AccountPanel, EmptyState, Metric, OrderCard, ProfileRow, TicketCard } from "./user-account-cards";
import { getAuthStorageVersion, getCurrentUser, subscribeToAuthStorage } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/format";
import {
  getFallbackUserAccountSnapshot,
  getUserAccountSnapshot,
  getUserAccountStorageVersion,
  subscribeToUserAccountStorage,
} from "@/lib/user-account-data";

const pendingStatuses = new Set(["PENDING_PAYMENT"]);
const boughtStatuses = new Set(["PAID", "TICKET_ISSUED"]);

export function UserAccountClient(): React.ReactElement {
  const storageVersion = useSyncExternalStore(subscribeToUserAccountStorage, getUserAccountStorageVersion, () => "__server__");
  const authVersion = useSyncExternalStore(subscribeToAuthStorage, getAuthStorageVersion, () => "__server__");
  const snapshot = useMemo(
    () => (storageVersion === "__server__" ? getFallbackUserAccountSnapshot() : getUserAccountSnapshot()),
    [storageVersion],
  );
  const authUser = useMemo(() => (authVersion === "__server__" ? null : getCurrentUser()), [authVersion]);
  const profile = authUser ?? snapshot.profile;

  const pendingOrders = useMemo(
    () => snapshot?.orders.filter((order) => pendingStatuses.has(order.status)) ?? [],
    [snapshot],
  );
  const purchasedOrders = useMemo(
    () => snapshot?.orders.filter((order) => boughtStatuses.has(order.status)) ?? [],
    [snapshot],
  );
  const spentAmount = purchasedOrders.reduce((total, order) => total + order.totalAmount, 0);

  return (
    <div className="grid gap-8">
      <section className="grid gap-6 rounded-lg border border-ticket-obsidian bg-white p-6 shadow-[6px_6px_0_#0d1118] md:grid-cols-[1fr_1.3fr] md:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-ticket-green/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-ticket-green">
            <UsersIcon className="h-4 w-4" />
            Tài khoản của tôi
          </div>
          <h1 className="mt-4 font-display text-3xl font-black tracking-tight md:text-4xl">{profile.fullName}</h1>
          <div className="mt-5 grid gap-3 text-sm text-slate-600">
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="Số điện thoại" value={profile.phone} />
            <ProfileRow label="Trạng thái" value={authUser ? "Đã đăng nhập" : "Khách"} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Đang giữ chỗ" value={pendingOrders.length.toString()} tone="amber" />
          <Metric label="Vé đã mua" value={snapshot.tickets.length.toString()} tone="green" />
          <Metric label="Đã thanh toán" value={formatCurrency(spentAmount)} tone="dark" />
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <AccountPanel
          title="Vé đang giữ chỗ"
          description="Các đơn đã chọn ghế/khu vé nhưng chưa hoàn tất thanh toán."
          icon={<CreditCardIcon className="h-5 w-5" />}
        >
          {pendingOrders.length > 0 ? (
            <div className="grid gap-4">
              {pendingOrders.map((order) => (
                <OrderCard key={order.orderId} order={order} actionLabel="Tiếp tục thanh toán" actionHref={`/orders/${order.orderId}`} />
              ))}
            </div>
          ) : (
            <EmptyState text="Hiện chưa có vé nào đang giữ chỗ." href="/concerts" action="Chọn sự kiện" />
          )}
        </AccountPanel>

        <AccountPanel
          title="Vé đã mua"
          description="E-ticket đã phát hành sau khi thanh toán thành công."
          icon={<TicketIcon className="h-5 w-5" />}
        >
          {snapshot.tickets.length > 0 ? (
            <div className="grid gap-4">
              {snapshot.tickets.map((ticket) => (
                <TicketCard key={ticket.ticketId} ticket={ticket} />
              ))}
            </div>
          ) : (
            <EmptyState text="Bạn chưa có e-ticket nào." href="/concerts" action="Mua vé ngay" />
          )}
        </AccountPanel>
      </section>
    </div>
  );
}
