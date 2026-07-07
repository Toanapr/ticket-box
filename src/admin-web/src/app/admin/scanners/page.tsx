import { ScannerManager } from "@/components/scanner-manager";

export const metadata = {
  title: "Scanner Devices | TicketBox Admin",
};

export default function ScannersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 md:p-10">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight text-ticket-obsidian lg:text-5xl">
          Scanner Fleet
        </h1>
        <p className="mt-2 max-w-2xl text-lg text-slate-600">
          Provision, monitor, and assign scanner devices to your events.
        </p>
      </div>

      <ScannerManager />
    </div>
  );
}
