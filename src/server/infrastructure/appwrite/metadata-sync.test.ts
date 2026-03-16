import { describe, expect, it } from "vitest";

import { toAppwriteDocumentId } from "@/server/infrastructure/appwrite/metadata-sync";

describe("metadata-sync", () => {
  it("preserves valid short Appwrite document IDs", () => {
    expect(toAppwriteDocumentId("project_123")).toBe("project_123");
  });

  it("maps long Clonable IDs to Appwrite-safe document IDs", () => {
    const mapped = toAppwriteDocumentId("project-12345678-1234-1234-1234-123456789abc");

    expect(mapped).toMatch(/^doc_[a-f0-9]{32}$/);
    expect(mapped.length).toBeLessThanOrEqual(36);
  });

  it("maps IDs with invalid leading characters to a safe document ID", () => {
    const mapped = toAppwriteDocumentId("-bad-id");

    expect(mapped).toMatch(/^doc_[a-f0-9]{32}$/);
  });
});
