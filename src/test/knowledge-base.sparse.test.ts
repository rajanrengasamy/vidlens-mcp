import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { TranscriptKnowledgeBase, type ImportTranscriptItem } from "../lib/knowledge-base.js";

test("sparse transcripts still import as a single searchable chunk", async () => {
  const dataDir = mkdtempSync(join(tmpdir(), "youtube-mcp-sparse-"));
  const kb = new TranscriptKnowledgeBase({ dataDir });

  const item: ImportTranscriptItem = {
    video: {
      videoId: "sparse00001",
      title: "Sparse transcript demo",
      channelTitle: "youtube-mcp",
      url: "https://www.youtube.com/watch?v=sparse00001",
    },
    transcript: {
      videoId: "sparse00001",
      sourceType: "manual_caption",
      transcriptText: "Quick checklist for sparse transcript fallback tonight.",
      segments: [
        {
          tStartSec: 0,
          tEndSec: 6,
          text: "Quick checklist for sparse transcript fallback tonight.",
        },
      ],
    },
    options: {
      strategy: "time_window",
      chunkSizeSec: 120,
      chunkOverlapSec: 30,
    },
  };

  const imported = kb.importVideos(
    {
      collectionId: "sparse-demo",
      sourceType: "videos",
      label: "Sparse demo",
    },
    [item],
  );

  assert.equal(imported.import.imported, 1);
  assert.equal(imported.import.failed, 0);
  assert.equal(imported.import.chunksCreated, 1);

  kb.setActiveCollection("sparse-demo");
  const search = await kb.search({ query: "sparse transcript fallback", maxResults: 3 });
  assert.equal(search.results.length, 1);
  assert.equal(search.searchMeta.scope.mode, "active");
  assert.equal(search.results[0]?.collectionId, "sparse-demo");

  kb.close();
});
