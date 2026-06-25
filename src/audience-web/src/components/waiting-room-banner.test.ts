import { describe, expect, it } from "vitest";
import { getWaitingRoomCopy, shouldRenderWaitingRoomBanner } from "./waiting-room-banner";

describe("waiting room banner helpers", () => {
  it("does not render a banner when backend has not required waiting room", () => {
    expect(shouldRenderWaitingRoomBanner("unavailable")).toBe(false);
  });

  it("keeps unavailable copy neutral instead of implying a missing token error", () => {
    expect(getWaitingRoomCopy("unavailable")).toMatchObject({
      title: "Waiting room chua duoc backend yeu cau",
    });
  });

  it("still renders active waiting-room states", () => {
    expect(shouldRenderWaitingRoomBanner("waiting")).toBe(true);
    expect(shouldRenderWaitingRoomBanner("admitted")).toBe(true);
    expect(shouldRenderWaitingRoomBanner("expired")).toBe(true);
  });
});
