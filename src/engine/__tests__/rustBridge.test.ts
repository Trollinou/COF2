import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatIpcError } from "../rustBridge";

describe("rustBridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("formatIpcError formats Cancelled and message errors cleanly", () => {
    expect(formatIpcError({ kind: "Cancelled" })).toBe("Annulé");
    expect(formatIpcError({ kind: "Rules", message: "Niveau invalide" })).toBe(
      "Niveau invalide",
    );
  });
});
