import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { YouTubeService } from "../lib/youtube-service.js";

/**
 * Import pipeline tests via dry-run mode.
 *
 * In dry-run mode the service fabricates sample video data and transcripts
 * without hitting YouTube. This lets us verify the import pipeline structure,
 * including import counts, skipped/failed handling, and collection management.
 */

describe("import pipeline via dry-run", () => {
  it("importVideos returns correct import counts", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-count-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
    });

    assert.ok(result.import, "result should have import field");
    assert.equal(result.import.totalVideos, 1, "totalVideos should be 1");
    assert.equal(typeof result.import.imported, "number", "imported should be a number");
    assert.equal(typeof result.import.skipped, "number", "skipped should be a number");
    assert.equal(typeof result.import.failed, "number", "failed should be a number");
    assert.equal(typeof result.import.chunksCreated, "number", "chunksCreated should be a number");
    assert.equal(typeof result.import.embeddingsGenerated, "number", "embeddingsGenerated should be a number");
  });

  it("importVideos with multiple videos counts all", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-multi-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ", "xxxxxxxxxxx"],
    });

    assert.ok(result.import, "result should have import field");
    assert.equal(result.import.totalVideos, 2, "totalVideos should be 2");
  });

  it("importVideos deduplicates video IDs (same ID listed twice)", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-dedup-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    });

    assert.ok(result.import, "result should have import field");
    assert.equal(result.import.totalVideos, 2, "totalVideos counts input array length");
    // Second occurrence should be skipped
    assert.ok(result.import.skipped >= 1, "should skip at least one duplicate");
  });

  it("importVideos skips already-imported video on second call", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-skip-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    // First import
    const first = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-collection",
    });
    assert.equal(first.import.totalVideos, 1);

    // Second import of same video with same collection (no reindex)
    const second = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-collection",
    });
    assert.equal(second.import.totalVideos, 1);
    assert.ok(second.import.skipped >= 1, "should skip already-imported video");
  });

  it("importVideos with reindexExisting re-imports previously imported video", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-reindex-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    // First import
    await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-reindex",
    });

    // Second import with reindexExisting
    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "test-reindex",
      reindexExisting: true,
    });
    assert.equal(result.import.totalVideos, 1);
    // Should not be skipped when reindexExisting is true
    assert.ok(result.import.imported >= 1 || result.import.skipped === 0, "should re-import or not skip");
  });

  it("importVideos returns collectionId", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-cid-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "my-explicit-collection",
    });

    assert.equal(result.collectionId, "my-explicit-collection");
  });

  it("importVideos auto-generates collectionId when not provided", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-autoid-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
    });

    assert.ok(result.collectionId, "collectionId should be present");
    assert.ok(result.collectionId.length > 0, "collectionId should not be empty");
  });

  it("importVideos activates collection by default", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-activate-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "auto-activate",
    });

    assert.equal(result.activeCollectionId, "auto-activate");
  });

  it("importVideos with activateCollection=false does not change active collection", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-no-activate-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
      collectionId: "no-activate",
      activateCollection: false,
    });

    // activeCollectionId should be undefined since nothing was set before
    assert.equal(result.activeCollectionId, undefined);
  });

  it("importVideos includes provenance", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-prov-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ"],
    });

    assert.ok(result.provenance, "result should have provenance");
    assert.ok(typeof result.provenance.sourceTier === "string");
    assert.ok(typeof result.provenance.fetchedAt === "string");
    assert.ok(typeof result.provenance.fallbackDepth === "number");
    assert.ok(typeof result.provenance.partial === "boolean");
  });

  it("importVideos records failures for invalid IDs when collectionId is provided", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-import-fail-"));
    const service = new YouTubeService({ dryRun: true, dataDir });

    // Must provide explicit collectionId because auto-generation calls requireVideoId on all inputs
    const result = await service.importVideos({
      videoIdsOrUrls: ["dQw4w9WgXcQ", "not-a-valid-id!"],
      collectionId: "test-failures",
    });

    assert.equal(result.import.totalVideos, 2);
    assert.ok(result.failures && result.failures.length > 0, "should have failures for invalid ID");
    assert.ok(result.failures!.some((f) => f.videoId === "not-a-valid-id!"), "should include the invalid ID in failures");
  });
});
