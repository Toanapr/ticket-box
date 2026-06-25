import { AlertIcon, CheckIcon } from "./icons";

export type WaitingRoomState = "waiting" | "admitted" | "expired" | "unavailable";

const copyByState: Record<WaitingRoomState, { title: string; message: string; tone: string }> = {
  waiting: {
    title: "Dang o hang cho flash-sale",
    message: "Backend chua cap quyen vao sale. Trang nay se khong tu quyet dinh con ve.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
  },
  admitted: {
    title: "Da duoc vao sale",
    message: "Token chi xac nhan luot vao hang checkout, khong dam bao con ve.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  expired: {
    title: "Token vao sale da het han",
    message: "Vui long vao lai hang cho. Retry cu khong duoc xem la giu ve thanh cong.",
    tone: "border-red-200 bg-red-50 text-red-900",
  },
  unavailable: {
    title: "Waiting room chua duoc backend yeu cau",
    message: "Neu dot ban bat waiting room, trang nay se hien trang thai cho vao sale tai day.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export function getWaitingRoomCopy(state: WaitingRoomState): { title: string; message: string; tone: string } {
  return copyByState[state];
}

export function shouldRenderWaitingRoomBanner(state: WaitingRoomState): boolean {
  return state !== "unavailable";
}

export function WaitingRoomBanner({
  state,
  retryAt,
}: {
  state: WaitingRoomState;
  retryAt?: string;
}): React.ReactElement {
  const copy = getWaitingRoomCopy(state);
  return (
    <div className={`flex gap-3 rounded border p-4 ${copy.tone}`}>
      {state === "admitted" ? <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div>
        <h2 className="font-black">{copy.title}</h2>
        <p className="mt-1 text-sm leading-6">{copy.message}</p>
        {retryAt ? <p className="mt-1 text-xs font-bold">Thu lai sau: {new Date(retryAt).toLocaleTimeString("vi-VN")}</p> : null}
      </div>
    </div>
  );
}
