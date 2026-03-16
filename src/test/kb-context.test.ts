import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { YouTubeService } from "../lib/youtube-service.js";

/**
 * Knowledge Base collection management tests via dry-run mode.
 *
 * These tests verify active collection state management, collection listing,
 * and the activeCollectionId propagation through import/set/clear operations.
 */

describe("KB collection management via dry-run", () => {
  it("import with explicit collectionId uses that ID", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-explid-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "my-explicit-collection",
    });

    assert.equal(result.collectionId, "my-explicit-collection");
  });

  it("import without explicit collectionId auto-generates one", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-autoid-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
    });

    assert.ok(result.collectionId, "should auto-generate a collectionId");
    assert.ok(result.collectionId.length > 0);
  });

  it("import activates collection by default and sets activeCollectionId", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-activate-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "auto-activate-test",
    });

    assert.equal(result.activeCollectionId, "auto-activate-test");
  });

  it("import with activateCollection=false does not set active collection", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-noactivate-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "no-activate",
      activateCollection: false,
    });

    assert.equal(result.activeCollectionId, undefined);
  });

  it("setActiveCollection sets the active collection", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-set-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    // First create a collection by importing
    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-set-active",
    });

    // Set it as active
    const result = await service.setActiveCollection({ collectionId: "test-set-active" });
    assert.equal(result.activeCollectionId, "test-set-active");
  });

  it("clearActiveCollection clears the active collection", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-clear-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    // Create and activate
    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-clear-active",
    });

    // Clear
    const result = await service.clearActiveCollection();
    assert.equal(result.cleared, true);
    assert.equal(result.previousActiveCollectionId, "test-clear-active");
  });

  it("listCollections returns created collections", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-list-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    // Start with empty
    const emptyList = await service.listCollections({});
    const initialCount = emptyList.collections.length;

    // Create a collection
    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-list-collection",
    });

    const list = await service.listCollections({});
    assert.equal(list.collections.length, initialCount + 1);
    assert.ok(
      list.collections.some((c) => c.collectionId === "test-list-collection"),
      "should contain the created collection",
    );
  });

  it("listCollections reflects activeCollectionId", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-list-active-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "active-listed",
    });

    const list = await service.listCollections({});
    assert.equal(list.activeCollectionId, "active-listed");
  });

  it("removeCollection removes a collection", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-remove-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "to-be-removed",
    });

    const removed = await service.removeCollection({ collectionId: "to-be-removed" });
    assert.equal(removed.removed, true);
    assert.equal(removed.collectionId, "to-be-removed");

    const list = await service.listCollections({});
    assert.ok(
      !list.collections.some((c) => c.collectionId === "to-be-removed"),
      "removed collection should no longer be listed",
    );
  });

  it("setActiveCollection with empty collectionId throws INVALID_INPUT", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-set-empty-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    try {
      await service.setActiveCollection({ collectionId: "" });
      assert.fail("should have thrown");
    } catch (error) {
      assert.ok(error instanceof Error);
      const detail = (error as { detail?: { code: string } }).detail;
      assert.ok(detail, "error should have detail");
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });

  it("second import into same collection skips already-imported videos", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-reimport-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "reimport-test",
    });

    const second = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "reimport-test",
    });

    assert.ok(second.import.skipped >= 1, "should skip already-imported video");
  });

  it("import with label persists label in collection summary", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-kb-label-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "labeled",
      label: "My Labeled Collection",
    });

    const list = await service.listCollections({});
    const collection = list.collections.find((c) => c.collectionId === "labeled");
    assert.ok(collection, "collection should exist");
    assert.equal(collection!.label, "My Labeled Collection");
  });
});
