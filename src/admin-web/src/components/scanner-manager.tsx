"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ScannerDevice,
  listScanners,
  provisionScanner,
  assignScanner,
  revokeScanner,
  listConcertsForAssign,
} from "@/lib/scanner-api";
import { Concert } from "@/lib/api";
import { buildScannerSetupQrPayload } from "@/lib/scanner-setup-qr";

export function ScannerManager() {
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannerApiBaseUrl, setScannerApiBaseUrl] = useState(
    () =>
      process.env.NEXT_PUBLIC_SCANNER_API_BASE_URL?.trim() ||
      (typeof window === "undefined"
        ? ""
        : `${window.location.protocol}//${window.location.hostname}:3000/scanner`),
  );

  // Modal states
  const [provisionResult, setProvisionResult] = useState<{
    deviceCode: string;
    accessToken: string;
  } | null>(null);

  const [assigningDevice, setAssigningDevice] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({
    concertId: "",
    gateCode: "",
    zoneCode: "",
  });

  const loadDevices = async () => {
    try {
      const [data, concertsData] = await Promise.all([
        listScanners(),
        listConcertsForAssign(),
      ]);
      setDevices(data.devices);
      setConcerts(concertsData);
    } catch (caught: unknown) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDevices(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const selectedConcert = concerts.find((c) => c.id === assignForm.concertId);
  let setupQrPayload: string | null = null;
  let setupQrError: string | null = null;

  if (provisionResult && scannerApiBaseUrl.trim()) {
    try {
      setupQrPayload = buildScannerSetupQrPayload({
        apiBaseUrl: scannerApiBaseUrl,
        deviceCode: provisionResult.deviceCode,
        accessToken: provisionResult.accessToken,
      });
    } catch (caught) {
      setupQrError =
        caught instanceof Error ? caught.message : "Invalid scanner API URL";
    }
  }

  const handleProvision = async () => {
    if (!confirm("Are you sure you want to provision a new device?")) return;
    try {
      const res = await provisionScanner();
      setProvisionResult(res);
      loadDevices();
    } catch (caught: unknown) {
      alert("Failed to provision: " + errorMessage(caught));
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (
      !confirm(
        "Are you sure you want to revoke this device? This will immediately lock out the scanner.",
      )
    )
      return;
    try {
      await revokeScanner(deviceId);
      loadDevices();
    } catch (caught: unknown) {
      alert("Failed to revoke: " + errorMessage(caught));
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningDevice) return;
    try {
      await assignScanner(assigningDevice, assignForm);
      setAssigningDevice(null);
      setAssignForm({ concertId: "", gateCode: "", zoneCode: "" });
      loadDevices();
    } catch (caught: unknown) {
      alert("Failed to assign: " + errorMessage(caught));
    }
  };

  if (loading && devices.length === 0)
    return <div className="p-8">Loading scanners...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Scanner Devices</h2>
        <button
          onClick={handleProvision}
          className="rounded-full bg-ticket-obsidian px-4 py-2 font-bold text-white hover:bg-black"
        >
          Provision New Device
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-red-700">{error}</div>
      )}

      {provisionResult && (
        <div className="rounded-lg border-2 border-ticket-green bg-green-50 p-6">
          <h3 className="mb-2 text-lg font-bold text-ticket-green">
            Device Provisioned Successfully!
          </h3>
          <p className="mb-4 text-sm text-slate-700">
            Please enter these credentials into the mobile app immediately. This
            is the only time the Access Token will be shown.
          </p>
          <div className="grid gap-6 rounded-lg bg-white p-4 md:grid-cols-[1fr_auto]">
            <div className="grid content-start gap-4 font-mono sm:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500">Device ID</div>
                <div className="font-bold">{provisionResult.deviceCode}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Access Token</div>
                <div className="font-bold break-all">
                  {provisionResult.accessToken}
                </div>
              </div>
              <label className="sm:col-span-2">
                <span className="text-xs text-slate-500">Scanner API URL</span>
                <input
                  className="mt-1 w-full rounded border border-black/15 px-3 py-2 font-sans text-sm"
                  value={scannerApiBaseUrl}
                  onChange={(event) => setScannerApiBaseUrl(event.target.value)}
                  spellCheck={false}
                />
                <span className="mt-1 block font-sans text-xs text-slate-500">
                  Use the backend LAN address reachable from the Android device.
                </span>
              </label>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-black/10 p-3">
              {setupQrPayload ? (
                <QRCodeSVG
                  value={setupQrPayload}
                  size={196}
                  level="M"
                  marginSize={2}
                  title="Scanner mobile setup QR"
                />
              ) : (
                <div className="grid h-[196px] w-[196px] place-items-center bg-red-50 p-4 text-center text-xs font-bold text-red-700">
                  {setupQrError ?? "Enter a scanner API URL"}
                </div>
              )}
              <span className="text-center text-xs font-bold uppercase tracking-wide text-slate-600">
                Scan once in Scanner Mobile
              </span>
            </div>
          </div>
          <button
            onClick={() => setProvisionResult(null)}
            className="mt-4 rounded border border-ticket-green px-4 py-2 text-sm font-bold text-ticket-green hover:bg-green-100"
          >
            Close
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-4 font-bold">Device Code</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Assignment</th>
              <th className="p-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {devices.map((device) => (
              <tr key={device.id}>
                <td className="p-4 font-mono font-medium">
                  {device.deviceCode}
                </td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                      device.status === "active"
                        ? "bg-green-100 text-green-700"
                        : device.status === "revoked"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {device.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  {device.activeAssignment ? (
                    <div>
                      <div className="font-bold">
                        Concert:{" "}
                        {device.activeAssignment.concertId.substring(0, 8)}...
                      </div>
                      <div className="text-slate-500">
                        Gate:{" "}
                        <span className="font-mono">
                          {device.activeAssignment.gateCode}
                        </span>{" "}
                        | Zone:{" "}
                        <span className="font-mono">
                          {device.activeAssignment.zoneCode}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      No active assignment
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAssigningDevice(device.id)}
                      disabled={device.status === "revoked"}
                      className="rounded bg-slate-100 px-3 py-1 font-bold hover:bg-slate-200 disabled:opacity-50"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => handleRevoke(device.id)}
                      disabled={device.status === "revoked"}
                      className="rounded bg-red-100 px-3 py-1 font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No scanner devices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {assigningDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold">Assign Device</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">Concert</label>
                <select
                  value={assignForm.concertId}
                  onChange={(e) =>
                    setAssignForm({
                      ...assignForm,
                      concertId: e.target.value,
                      zoneCode: "",
                    })
                  }
                  className="w-full rounded-lg border p-2"
                  required
                >
                  <option value="">Select a Concert...</option>
                  {concerts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">
                  Gate Code
                </label>
                <input
                  type="text"
                  value={assignForm.gateCode}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, gateCode: e.target.value })
                  }
                  className="w-full rounded-lg border p-2"
                  placeholder="e.g. GATE_MAIN"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">
                  Zone Code
                </label>
                <select
                  value={assignForm.zoneCode}
                  onChange={(e) =>
                    setAssignForm({ ...assignForm, zoneCode: e.target.value })
                  }
                  className="w-full rounded-lg border p-2"
                  required
                  disabled={!selectedConcert}
                >
                  <option value="">Select a Zone...</option>
                  {selectedConcert?.ticketTypes.map((tt) => (
                    <option key={tt.zoneCode} value={tt.zoneCode}>
                      {tt.name} ({tt.zoneCode})
                    </option>
                  ))}
                  <option value="GUEST_VIP">Guest VIP (External CSV)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAssigningDevice(null)}
                  className="flex-1 rounded-lg bg-slate-100 p-2 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-ticket-obsidian p-2 font-bold text-white hover:bg-black"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : "Unknown error";
}
