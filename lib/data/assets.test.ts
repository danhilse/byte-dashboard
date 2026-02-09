import { describe, expect, it } from "vitest"

import {
  formatFileSize,
  getAssetById,
  getAssetsByContact,
  getAssetsByWorkflow,
} from "@/lib/data/assets"

describe("lib/data/assets", () => {
  it("returns a matching asset by id", () => {
    const asset = getAssetById("asset1")

    expect(asset?.fileName).toBe("contract_draft_v2.pdf")
  })

  it("returns undefined for an unknown asset id", () => {
    expect(getAssetById("missing")).toBeUndefined()
  })

  it("filters assets by workflow id", () => {
    const assets = getAssetsByWorkflow("w1")

    expect(assets).toHaveLength(2)
    expect(assets.every((asset) => asset.workflowExecutionId === "w1")).toBe(true)
  })

  it("filters assets by contact id", () => {
    const assets = getAssetsByContact("c1")

    expect(assets).toHaveLength(1)
    expect(assets[0]?.id).toBe("asset4")
  })

  it("formats byte sizes for base units and MB values", () => {
    expect(formatFileSize(0)).toBe("0 Bytes")
    expect(formatFileSize(1024)).toBe("1 KB")
    expect(formatFileSize(2_621_440)).toBe("2.5 MB")
  })
})
