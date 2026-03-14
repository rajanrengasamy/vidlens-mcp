import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { YouTubeService } from "../lib/youtube-service.js";

test("knowledge-base flow imports, searches, lists, and removes collections", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "youtube-mcp-kb-"));
  const service = new YouTubeService({ dryRun: true, dataDir });
  const playlistId = "PL590L5WQmH8fJ54FNRU3kVZKeTxQqM2C4";

  const imported = await service.importPlaylist({
    playlistUrlOrId: playlistId,
    maxVideos: 2,
    label: "Stanford-ish Playlist",
  });

  assert.equal(imported.collectionId, `playlist-${playlistId}`);
  assert.equal(imported.import.imported, 2);
  assert.equal(imported.import.chunksCreated > 0, true);
  assert.equal(imported.activeCollectionId, imported.collectionId);

  const search = await service.searchTranscripts({
    query: "title patterns and checklist",
    maxResults: 5,
  });

  assert.equal(search.results.length > 0, true);
  assert.equal(search.results[0]?.timestampUrl.includes("youtu.be/"), true);
  assert.equal(search.searchMeta.totalChunksSearched > 0, true);
  assert.equal(search.searchMeta.scope.mode, "active");
  assert.deepEqual(search.searchMeta.scope.searchedCollectionIds, [imported.collectionId]);

  const collections = await service.listCollections({ includeVideoList: true });
  const target = collections.collections.find((item) => item.collectionId === imported.collectionId);
  assert.equal(Boolean(target), true);
  assert.equal(collections.activeCollectionId, imported.collectionId);
  assert.equal(target?.isActive, true);
  assert.equal(target?.videoCount, 2);
  assert.equal((target?.videos?.length ?? 0) > 0, true);

  const removed = await service.removeCollection({ collectionId: imported.collectionId });
  assert.equal(removed.removed, true);
  assert.equal(removed.chunksDeleted > 0, true);
  assert.equal(removed.clearedActiveCollection, true);

  const afterDelete = await service.listCollections();
  assert.equal(afterDelete.collections.some((item) => item.collectionId === imported.collectionId), false);
  assert.equal(afterDelete.activeCollectionId, undefined);
});
