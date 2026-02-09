import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEFINITION_STATUSES,
  normalizeDefinitionStatuses,
} from "@/lib/workflow-builder-v2/status-guardrails";

describe("lib/workflow-builder-v2/status-guardrails", () => {
  it("uses default statuses when undefined", () => {
    const result = normalizeDefinitionStatuses(undefined);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statuses).toEqual(DEFAULT_DEFINITION_STATUSES);
    }
  });

  it("rejects empty status arrays", () => {
    const result = normalizeDefinitionStatuses([]);

    expect(result).toEqual({
      ok: false,
      error: "statuses must contain at least one status",
    });
  });

  it("rejects non-array statuses payload", () => {
    const result = normalizeDefinitionStatuses("invalid");

    expect(result).toEqual({
      ok: false,
      error: "statuses must be a valid DefinitionStatus[] when provided",
    });
  });

  it("rejects non-object status entries", () => {
    const result = normalizeDefinitionStatuses([
      { id: "draft", label: "Draft", order: 0 },
      null,
    ]);

    expect(result).toEqual({
      ok: false,
      error: "statuses must be a valid DefinitionStatus[] when provided",
    });
  });

  it("rejects duplicate status ids", () => {
    const result = normalizeDefinitionStatuses([
      { id: "draft", label: "Draft", order: 0 },
      { id: "draft", label: "Duplicate", order: 1 },
    ]);

    expect(result).toEqual({
      ok: false,
      error: 'statuses contains duplicate id "draft"',
    });
  });

  it("rejects duplicate status orders", () => {
    const result = normalizeDefinitionStatuses([
      { id: "draft", label: "Draft", order: 0 },
      { id: "approved", label: "Approved", order: 0 },
    ]);

    expect(result).toEqual({
      ok: false,
      error: 'statuses contains duplicate order "0"',
    });
  });

  it("normalizes and sorts statuses", () => {
    const result = normalizeDefinitionStatuses([
      { id: " approved ", label: " Approved ", order: 1, color: " #22c55e " },
      { id: "draft", label: "Draft", order: 0 },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.statuses).toEqual([
        { id: "draft", label: "Draft", order: 0, color: undefined },
        { id: "approved", label: "Approved", order: 1, color: "#22c55e" },
      ]);
    }
  });
});
