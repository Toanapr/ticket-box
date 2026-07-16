import { ScannerManager } from "@/components/scanner-manager";

export const metadata = {
  title: "Scanner Devices | TicketBox Admin",
};

export default function ScannersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 md:p-10">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-ticket-obsidian lg:text-5xl">
          Thiết bị Soát vé
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-slate-600">
          Đăng ký, giám sát và gán các thiết bị soát vé cho sự kiện của bạn.
        </p>
      </div>

      <ScannerManager />
    </div>
  );
}
