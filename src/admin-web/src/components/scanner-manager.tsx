"use client";

import { useEffect, useState } from "react";
import { 
  ScannerDevice, 
  listScanners, 
  provisionScanner, 
  assignScanner, 
  revokeScanner,
  listConcertsForAssign
} from "@/lib/scanner-api";
import { Concert } from "@/lib/api";

export function ScannerManager() {
  const [devices, setDevices] = useState<ScannerDevice[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    setLoading(true);
    try {
      const [data, concertsData] = await Promise.all([
        listScanners(),
        listConcertsForAssign()
      ]);
      setDevices(data.devices);
      setConcerts(concertsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const selectedConcert = concerts.find(c => c.id === assignForm.concertId);


  const handleProvision = async () => {
    if (!confirm("Bạn có chắc chắn muốn cấp phép một thiết bị mới không?")) return;
    try {
      const res = await provisionScanner();
      setProvisionResult(res);
      loadDevices();
    } catch (err: any) {
      alert("Không thể cấp phép: " + err.message);
    }
  };

  const handleRevoke = async (deviceId: string) => {
    if (!confirm("Bạn có chắc chắn muốn thu hồi thiết bị này? Hành động này sẽ khóa máy quét ngay lập tức.")) return;
    try {
      await revokeScanner(deviceId);
      loadDevices();
    } catch (err: any) {
      alert("Không thể thu hồi: " + err.message);
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
    } catch (err: any) {
      alert("Không thể gán: " + err.message);
    }
  };

  if (loading && devices.length === 0) return <div className="p-8">Đang tải thiết bị soát vé...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Danh sách Thiết bị</h2>
        <button
          onClick={handleProvision}
          className="rounded-full bg-ticket-obsidian px-4 py-2 font-bold text-white hover:bg-black"
        >
          Cấp phép thiết bị mới
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-100 p-4 text-red-700">{error}</div>}

      {provisionResult && (
        <div className="rounded-lg border-2 border-ticket-green bg-green-50 p-6">
          <h3 className="mb-2 text-lg font-bold text-ticket-green">Cấp phép thiết bị thành công!</h3>
          <p className="mb-4 text-sm text-slate-700">Vui lòng nhập các thông tin đăng nhập này vào ứng dụng di động ngay lập tức. Đây là lần duy nhất Access Token được hiển thị.</p>
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-white p-4 font-mono">
            <div>
              <div className="text-xs text-slate-500">Mã thiết bị (Device ID)</div>
              <div className="font-bold">{provisionResult.deviceCode}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Mã truy cập (Access Token)</div>
              <div className="font-bold break-all">{provisionResult.accessToken}</div>
            </div>
          </div>
          <button 
            onClick={() => setProvisionResult(null)}
            className="mt-4 rounded border border-ticket-green px-4 py-2 text-sm font-bold text-ticket-green hover:bg-green-100"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-4 font-bold">Mã thiết bị</th>
              <th className="p-4 font-bold">Trạng thái</th>
              <th className="p-4 font-bold">Lượt gán</th>
              <th className="p-4 font-bold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {devices.map((device) => (
              <tr key={device.id}>
                <td className="p-4 font-mono font-medium">{device.deviceCode}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                    device.status === 'active' ? 'bg-green-100 text-green-700' :
                    device.status === 'revoked' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {device.status === 'active' ? 'HOẠT ĐỘNG' : device.status === 'revoked' ? 'THU HỒI' : device.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  {device.activeAssignment ? (
                    <div>
                      <div className="font-bold">Sự kiện: {device.activeAssignment.concertId.substring(0, 8)}...</div>
                      <div className="text-slate-500">
                        Cổng: <span className="font-mono">{device.activeAssignment.gateCode}</span> | 
                        Khu vực: <span className="font-mono">{device.activeAssignment.zoneCode}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Chưa gán sự kiện</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAssigningDevice(device.id)}
                      disabled={device.status === 'revoked'}
                      className="rounded bg-slate-100 px-3 py-1 font-bold hover:bg-slate-200 disabled:opacity-50"
                    >
                      Gán
                    </button>
                    <button
                      onClick={() => handleRevoke(device.id)}
                      disabled={device.status === 'revoked'}
                      className="rounded bg-red-100 px-3 py-1 font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Thu hồi
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  Không tìm thấy thiết bị soát vé nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {assigningDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold">Gán thiết bị</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold">Sự kiện</label>
                <select 
                  value={assignForm.concertId}
                  onChange={(e) => setAssignForm({...assignForm, concertId: e.target.value, zoneCode: ""})}
                  className="w-full rounded-lg border p-2"
                  required
                >
                  <option value="">Chọn một Sự kiện...</option>
                  {concerts.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Mã cổng (Gate)</label>
                <input 
                  type="text" 
                  value={assignForm.gateCode}
                  onChange={(e) => setAssignForm({...assignForm, gateCode: e.target.value})}
                  className="w-full rounded-lg border p-2"
                  placeholder="Ví dụ: GATE_MAIN"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Mã khu vực (Zone)</label>
                <select 
                  value={assignForm.zoneCode}
                  onChange={(e) => setAssignForm({...assignForm, zoneCode: e.target.value})}
                  className="w-full rounded-lg border p-2"
                  required
                  disabled={!selectedConcert}
                >
                  <option value="">Chọn một khu vực...</option>
                  {selectedConcert?.ticketTypes.map(tt => (
                    <option key={tt.zoneCode} value={tt.zoneCode}>
                      {tt.name} ({tt.zoneCode})
                    </option>
                  ))}
                  <option value="GUEST_VIP">Khách VIP (Nhập từ file CSV)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setAssigningDevice(null)}
                  className="flex-1 rounded-lg bg-slate-100 p-2 font-bold hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-lg bg-ticket-obsidian p-2 font-bold text-white hover:bg-black"
                >
                  Xác nhận gán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
