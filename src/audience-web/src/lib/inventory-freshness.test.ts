import { describe, expect, it } from "vitest";
import { formatInventoryFreshness } from "./inventory-freshness";

describe("inventory freshness display", () => {
  it("uses near realtime wording when backend sends no cache metadata", () => {
    expect(formatInventoryFreshness({})).toEqual({ label: "Gan realtime", tone: "green" });
  });

  it("uses cached and stale wording from backend metadata", () => {
    expect(formatInventoryFreshness({ inventoryCachedAt: "2026-07-15T00:00:00.000Z" })).toEqual({
      label: "Cập nhật gần đây",
      tone: "slate",
    });
    expect(
      formatInventoryFreshness(
        { inventoryCachedAt: "2026-07-15T00:00:00.000Z", inventoryStaleAt: "2026-07-15T00:00:05.000Z" },
        new Date("2026-07-15T00:00:06.000Z"),
      ),
    ).toEqual({ label: "Dữ liệu có thể chậm vài giây", tone: "amber" });
  });
});
