import { AlertIcon, CheckIcon } from "./icons";

export type WaitingRoomState =
  | "waiting"
  | "admitted"
  | "expired"
  | "unavailable";

const copyByState: Record<
  WaitingRoomState,
  { title: string; message: string; tone: string }
> = {
  waiting: {
    title: "Đang ở hàng chờ",
    message: "Bạn cần chờ đến lượt trước khi tiếp tục checkout.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
  },
  admitted: {
    title: "Đã đến lượt checkout",
    message: "Bạn có thể tiếp tục giữ vé và thanh toán trong phiên hiện tại.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  expired: {
    title: "Phiên checkout đã hết hạn",
    message: "Vui lòng vào lại hàng chờ để tiếp tục.",
    tone: "border-red-200 bg-red-50 text-red-900",
  },
  unavailable: {
    title: "Checkout sẵn sàng",
    message: "Bạn có thể tiếp tục chọn vé và thanh toán.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

export function getWaitingRoomCopy(state: WaitingRoomState): {
  title: string;
  message: string;
  tone: string;
} {
  return copyByState[state];
}

export function shouldRenderWaitingRoomBanner(
  state: WaitingRoomState,
): boolean {
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
      {state === "admitted" ? (
        <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
      ) : (
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <div>
        <h2 className="font-black">{copy.title}</h2>
        <p className="mt-1 text-sm leading-6">{copy.message}</p>
        {retryAt ? (
          <p className="mt-1 text-xs font-bold">
            Thử lại sau: {new Date(retryAt).toLocaleTimeString("vi-VN")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
