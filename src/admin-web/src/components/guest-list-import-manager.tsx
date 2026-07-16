"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ActiveGuestList,
  Concert,
  GuestListImportBatch,
  deleteActiveGuestList,
  listActiveGuestList,
  listGuestListImports,
  uploadGuestListCsv,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import {
  AdminButton,
  AdminDataTable,
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminPanelTitle,
  AdminStatusBadge,
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  fileInputClassName,
} from "./admin-ui";

export function GuestListImportManager({
  concert,
  initialImports,
  initialActiveGuestList,
}: {
  concert: Concert;
  initialImports: GuestListImportBatch[];
  initialActiveGuestList: ActiveGuestList;
}) {
  const [imports, setImports] = useState(initialImports);
  const [activeGuestList, setActiveGuestList] = useState(initialActiveGuestList);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeVersion = useMemo(
    () => imports.find((item) => item.version?.isActive),
    [imports],
  );

  async function refreshGuestListState() {
    const [nextImports, nextGuestList] = await Promise.all([
      listGuestListImports(concert.id),
      listActiveGuestList(concert.id),
    ]);
    setImports(nextImports);
    setActiveGuestList(nextGuestList);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) {
      setError("Vui lòng chọn file CSV trước.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await uploadGuestListCsv(concert.id, file);
      await refreshGuestListState();
      setFile(null);
      setMessage(
        result.idempotent
          ? "File CSV này đã được nhập trước đó; hệ thống trả về lô dữ liệu hiện tại."
          : result.status === "published"
            ? "Danh sách khách mời đã được xuất bản vào khu vực khách mời."
            : "File CSV đã được tải lên tạm thời nhưng có lỗi kiểm tra dữ liệu.",
      );
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nhập danh sách thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteGuestList() {
    const confirmed = window.confirm(
      `Xóa danh sách khách mời đang hoạt động của "${concert.title}"? Thao tác này sẽ gỡ bỏ tất cả khách mời đã xuất bản khỏi hệ thống.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    setMessage(null);

    try {
      const result = await deleteActiveGuestList(concert.id);
      await refreshGuestListState();
      setMessage(
        result.deleted
          ? "Đã xóa danh sách khách mời đang hoạt động."
          : "Không có danh sách khách mời nào để xóa.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Không thể xóa danh sách khách mời.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPanel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <AdminPanelTitle
            title="Nhập danh sách CSV"
            description={`Phiên bản hoạt động: ${activeVersion?.version?.versionNo ?? "không có"}. Quy trình nhập danh sách khách mời không yêu cầu vị trí ghế hoặc hạng vé công cộng. Tất cả khách mời sẽ tự động được xếp vào khu vực khách mời.`}
          />
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-start"
          >
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={fileInputClassName}
            />
            <AdminButton type="submit" disabled={isSubmitting} className="sm:shrink-0">
              {isSubmitting ? "Đang nhập..." : "Tải CSV lên"}
            </AdminButton>
          </form>
        </div>
        <div className="mt-4">
          <AdminNotice tone="neutral">
            Các cột bắt buộc: <strong>full_name</strong> và ít nhất một trong các cột: <strong>email</strong>, <strong>phone</strong>, hoặc <strong>sponsor_id</strong>. Các cột vị trí ghế trước đây sẽ bị bỏ qua.
          </AdminNotice>
        </div>
        {message ? (
          <div className="mt-4">
            <AdminNotice tone="success">{message}</AdminNotice>
          </div>
        ) : null}
        {error ? (
          <div className="mt-4">
            <AdminNotice tone="error">{error}</AdminNotice>
          </div>
        ) : null}
      </AdminPanel>

      <AdminPanel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <AdminPanelTitle
            title="Danh sách khách mời đã xuất bản"
            description={
              activeGuestList.version
                ? `Phiên bản v${activeGuestList.version.versionNo} xuất bản lúc ${formatDateTime(activeGuestList.version.publishedAt)}`
                : "Chưa có phiên bản danh sách khách mời nào được xuất bản."
            }
          />
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <GuestListStat label="Số khách mời" value={String(activeGuestList.entries.length)} />
              <GuestListStat label="Khu vực" value="Khách mời" />
              <GuestListStat
                label="Phiên bản"
                value={activeGuestList.version ? `v${activeGuestList.version.versionNo}` : "-"}
              />
            </div>
            <AdminButton
              type="button"
              variant="danger"
              className="min-h-11 px-4"
              onClick={handleDeleteGuestList}
              disabled={isDeleting || !activeGuestList.version}
            >
              {isDeleting ? "Đang xóa..." : "Xóa danh sách khách mời"}
            </AdminButton>
          </div>
        </div>

        {activeGuestList.entries.length === 0 ? (
          <div className="mt-4">
            <AdminNotice tone="neutral">
              Khách mời đã xuất bản sẽ hiển thị ở đây sau khi nhập file thành công.
            </AdminNotice>
          </div>
        ) : null}
      </AdminPanel>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[840px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Khách mời</th>
              <th className="px-6 py-4">Vùng truy cập</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Số điện thoại</th>
              <th className="px-6 py-4">Nhà tài trợ</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {activeGuestList.entries.map((entry) => (
              <tr key={entry.id} className="align-top">
                <td className="px-6 py-5">
                  <p className="font-display text-lg font-black tracking-tight text-ticket-obsidian">
                    {entry.fullName}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {entry.identityKey}
                  </p>
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  Khu vực khách mời
                </td>
                <td className="px-6 py-5 text-sm text-slate-600">{entry.email ?? "-"}</td>
                <td className="px-6 py-5 text-sm text-slate-600">{entry.phone ?? "-"}</td>
                <td className="px-6 py-5 text-sm text-slate-600">{entry.sponsorId ?? "-"}</td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {activeGuestList.entries.length === 0 ? (
          <AdminEmptyState>Chưa có khách mời nào được xuất bản.</AdminEmptyState>
        ) : null}
      </AdminDataTable>

      <AdminDataTable>
        <AdminTable minWidthClassName="min-w-[1080px]">
          <AdminTableHead>
            <tr>
              <th className="px-6 py-4">Thời gian tạo</th>
              <th className="px-6 py-4">Tên File</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Số dòng</th>
              <th className="px-6 py-4">Dòng trùng</th>
              <th className="px-6 py-4">Phiên bản</th>
              <th className="px-6 py-4">Thao tác</th>
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {imports.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-6 py-5">
                  <p className="font-display text-lg font-black tracking-tight text-ticket-obsidian">
                    {item.originalName ?? item.rawObjectKey}
                  </p>
                </td>
                <td className="px-6 py-5">
                  <AdminStatusBadge status={item.status} />
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {item.summary.validRows}/{item.summary.totalRows} hợp lệ
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {item.summary.duplicateRows}
                </td>
                <td className="px-6 py-5 text-sm font-semibold text-slate-700">
                  {item.version ? `v${item.version.versionNo}` : "-"}
                </td>
                <td className="px-6 py-5">
                  {item.summary.invalidRows > 0 ? (
                    <a
                      href={`/admin/guest-list/imports/${item.id}/errors`}
                      className="inline-flex min-h-11 items-center justify-center rounded border border-black/10 bg-ticket-alabaster px-4 text-sm font-black uppercase tracking-wide text-ticket-obsidian transition hover:bg-white"
                    >
                      Xem lỗi
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>

        {imports.length === 0 ? (
          <AdminEmptyState>Chưa có lượt nhập danh sách nào.</AdminEmptyState>
        ) : null}
      </AdminDataTable>
    </div>
  );
}

function GuestListStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-ticket-stone px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-black tracking-tight text-ticket-obsidian">
        {value}
      </p>
    </div>
  );
}
