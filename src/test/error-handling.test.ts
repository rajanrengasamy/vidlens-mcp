import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { YouTubeService } from "../lib/youtube-service.js";
import type { GracefulError } from "../lib/types.js";

/**
 * Error handling tests.
 *
 * GracefulError is an interface with: code, message, retryable, attemptedTiers, suggestion?.
 * The service creates instances internally via private methods (invalidInputDetail,
 * normalizeError). We test through public methods that trigger these error paths.
 *
 * Key error codes: INVALID_INPUT, NOT_FOUND, RATE_LIMITED, UPSTREAM_UNAVAILABLE,
 * INSUFFICIENT_PUBLIC_DATA, INTERNAL_ERROR
 */

const VALID_ERROR_CODES = new Set([
  "INVALID_INPUT",
  "NOT_FOUND",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "INSUFFICIENT_PUBLIC_DATA",
  "INTERNAL_ERROR",
]);

function assertGracefulError(error: unknown): GracefulError {
  assert.ok(error instanceof Error, "should throw an Error");
  const detail = (error as { detail?: GracefulError }).detail;
  assert.ok(detail, "error should have a .detail property (GracefulError)");
  assert.ok(typeof detail.code === "string", "detail.code should be a string");
  assert.ok(typeof detail.message === "string", "detail.message should be a string");
  assert.ok(typeof detail.retryable === "boolean", "detail.retryable should be a boolean");
  assert.ok(Array.isArray(detail.attemptedTiers), "detail.attemptedTiers should be an array");
  return detail;
}

describe("INVALID_INPUT errors", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-errors-"));
  const service = new YouTubeService({ dryRun: true, dataDir });

  it("empty query produces INVALID_INPUT with suggestion", async () => {
    try {
      await service.findVideos({ query: "" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
      assert.ok(VALID_ERROR_CODES.has(detail.code), "code should be from allowed set");
      assert.ok(detail.message.length > 0, "message should not be empty");
      assert.equal(detail.retryable, false, "INVALID_INPUT should not be retryable");
    }
  });

  it("invalid video reference produces INVALID_INPUT", async () => {
    try {
      await service.inspectVideo({ videoIdOrUrl: "not-a-valid-id-at-all" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
      assert.ok(detail.message.length > 0, "should have a meaningful message");
    }
  });

  it("invalid playlist reference produces INVALID_INPUT", async () => {
    try {
      await service.expandPlaylist({ playlistUrlOrId: "definitely-not-a-playlist" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });

  it("empty channel reference produces INVALID_INPUT", async () => {
    try {
      await service.inspectChannel({ channelIdOrHandleOrUrl: "" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });

  it("empty videoIdsOrUrls array produces INVALID_INPUT", async () => {
    try {
      await service.importVideos({ videoIdsOrUrls: [] });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });

  it("empty transcript video reference produces INVALID_INPUT", async () => {
    try {
      await service.readTranscript({ videoIdOrUrl: "" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });

  it("empty search transcript query produces INVALID_INPUT", async () => {
    try {
      await service.searchTranscripts({ query: "" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });

  it("empty comments video reference produces INVALID_INPUT", async () => {
    try {
      await service.readComments({ videoIdOrUrl: "" });
      assert.fail("should have thrown");
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
    }
  });
});

describe("GracefulError structural invariants", () => {
  const dataDir = mkdtempSync(join(tmpdir(), "vidlens-mcp-err-struct-"));
  const service = new YouTubeService({ dryRun: true, dataDir });

  it("all GracefulError instances have required fields: code, message, retryable, attemptedTiers", async () => {
    const errorTriggers = [
      () => service.findVideos({ query: "" }),
      () => service.inspectVideo({ videoIdOrUrl: "" }),
      () => service.readTranscript({ videoIdOrUrl: "" }),
      () => service.readComments({ videoIdOrUrl: "" }),
      () => service.searchTranscripts({ query: "" }),
    ];

    for (const trigger of errorTriggers) {
      try {
        await trigger();
        assert.fail("should have thrown");
      } catch (error) {
        const detail = assertGracefulError(error);
        assert.ok(VALID_ERROR_CODES.has(detail.code), `code "${detail.code}" should be from allowed set`);
        assert.ok(detail.message.length > 0, "message should not be empty");
        assert.equal(typeof detail.retryable, "boolean");
        assert.ok(Array.isArray(detail.attemptedTiers));
      }
    }
  });

  it("INVALID_INPUT errors include suggestion field", async () => {
    try {
      await service.findVideos({ query: "" });
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.code, "INVALID_INPUT");
      assert.ok(typeof detail.suggestion === "string", "INVALID_INPUT should include suggestion");
      assert.ok(detail.suggestion!.length > 0, "suggestion should not be empty");
    }
  });

  it("error codes are from the allowed set", async () => {
    try {
      await service.inspectVideo({ videoIdOrUrl: "!!invalid!!" });
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.ok(
        VALID_ERROR_CODES.has(detail.code),
        `"${detail.code}" should be one of: ${[...VALID_ERROR_CODES].join(", ")}`,
      );
    }
  });

  it("INVALID_INPUT errors are not retryable", async () => {
    try {
      await service.expandPlaylist({ playlistUrlOrId: "invalid" });
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.equal(detail.retryable, false, "INVALID_INPUT should not be retryable");
    }
  });

  it("INVALID_INPUT errors have empty attemptedTiers", async () => {
    try {
      await service.findVideos({ query: "" });
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.deepEqual(detail.attemptedTiers, [], "INVALID_INPUT should have empty attemptedTiers");
    }
  });

  it("message does not contain stack traces or raw file paths", async () => {
    try {
      await service.findVideos({ query: "" });
    } catch (error) {
      const detail = assertGracefulError(error);
      assert.ok(!detail.message.includes(".ts:"), "message should not contain .ts file references");
      assert.ok(!detail.message.includes(".js:"), "message should not contain .js file references");
    }
  });
});
