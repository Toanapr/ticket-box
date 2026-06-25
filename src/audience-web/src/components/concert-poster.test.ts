import { describe, expect, it } from "vitest";
import { shouldShowPoster } from "./concert-poster";

describe("concert poster fallback", () => {
  it("shows the image until that source fails", () => {
    expect(shouldShowPoster("/poster.png", null)).toBe(true);
    expect(shouldShowPoster("/poster.png", "/poster.png")).toBe(false);
  });

  it("allows a replacement URL after the previous URL failed", () => {
    expect(shouldShowPoster("/poster-v2.png", "/poster-v1.png")).toBe(true);
  });

  it("uses fallback when no source exists", () => {
    expect(shouldShowPoster(undefined, null)).toBe(false);
  });
});
