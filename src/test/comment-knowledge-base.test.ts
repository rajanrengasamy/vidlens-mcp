import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CommentKnowledgeBase,
  type CommentImportItem,
} from "../lib/comment-knowledge-base.js";

function makeTestKB(): CommentKnowledgeBase {
  const dataDir = mkdtempSync(join(tmpdir(), "youtube-mcp-comment-kb-"));
  return new CommentKnowledgeBase({ dataDir });
}

function sampleComments(): CommentImportItem {
  return {
    videoId: "testVid001",
    videoTitle: "How to Build an MCP Server",
    channelTitle: "youtube-mcp",
    comments: [
      {
        commentId: "c1",
        author: "Alice",
        text: "This is the best tutorial on building MCP servers I have ever seen. Clear explanations and great examples.",
        likeCount: 42,
        publishedAt: "2026-03-01T10:00:00Z",
        replies: [
          {
            commentId: "c1r1",
            author: "Bob",
            text: "Totally agree, the examples were really helpful for understanding the architecture.",
            likeCount: 8,
            publishedAt: "2026-03-01T11:00:00Z",
          },
        ],
      },
      {
        commentId: "c2",
        author: "Charlie",
        text: "The transcript search feature is amazing. I can finally find specific moments in long videos.",
        likeCount: 15,
        publishedAt: "2026-03-02T08:00:00Z",
        replies: [],
      },
      {
        commentId: "c3",
        author: "Diana",
        text: "Would love to see a follow-up video on semantic embeddings and vector search optimization.",
        likeCount: 23,
        publishedAt: "2026-03-02T09:00:00Z",
        replies: [
          {
            commentId: "c3r1",
            author: "Eve",
            text: "Yes please! Especially how the local LSA hybrid model compares to cloud embeddings.",
            likeCount: 5,
            publishedAt: "2026-03-02T10:00:00Z",
          },
          {
            commentId: "c3r2",
            author: "Frank",
            text: "I tried the Gemini embeddings and they are significantly better for technical content.",
            likeCount: 3,
            publishedAt: "2026-03-02T11:00:00Z",
          },
        ],
      },
      {
        commentId: "c4",
        author: "Grace",
        text: "The hook pattern analysis tool helped me improve my video intros dramatically.",
        likeCount: 31,
        publishedAt: "2026-03-03T07:00:00Z",
        replies: [],
      },
    ],
  };
}

test("comment KB: import, search, list, and remove", async () => {
  const kb = makeTestKB();
  const item = sampleComments();
  const collectionId = "test-comments";

  // Import
  const imported = kb.importComments({ collectionId, label: "Test Comments" }, [item]);
  assert.equal(imported.collectionId, collectionId);
  assert.equal(imported.import.totalThreads, 4);
  assert.equal(imported.import.totalComments > 0, true, "should have indexed comments");
  assert.equal(imported.import.chunksCreated > 0, true, "should have created chunks");

  // Search — query matching comment content
  kb.setActiveCollection(collectionId);
  const searchResult = await kb.search({
    query: "MCP server tutorial examples",
    maxResults: 5,
  });
  assert.equal(searchResult.results.length > 0, true, "should find matching comments");
  assert.equal(searchResult.searchMeta.scope.mode, "active");
  assert.equal(searchResult.searchMeta.totalChunksSearched > 0, true);

  // Verify result shape
  const topResult = searchResult.results[0];
  assert.equal(typeof topResult.author, "string");
  assert.equal(typeof topResult.commentText, "string");
  assert.equal(typeof topResult.score, "number");
  assert.equal(typeof topResult.videoId, "string");
  assert.equal(topResult.collectionId, collectionId);

  // Search for replies
  const replySearch = await kb.search({
    query: "Gemini embeddings cloud technical content",
    maxResults: 5,
  });
  assert.equal(replySearch.results.length > 0, true, "should find matching replies");
  const replyResult = replySearch.results.find((r) => r.isReply);
  if (replyResult) {
    assert.equal(replyResult.isReply, true);
    assert.equal(typeof replyResult.parentAuthor, "string");
  }

  // List collections
  const collections = kb.listCollections(true);
  assert.equal(collections.collections.length, 1);
  const col = collections.collections[0];
  assert.equal(col.collectionId, collectionId);
  assert.equal(col.label, "Test Comments");
  assert.equal(col.isActive, true);
  assert.equal(col.videoCount, 1);
  assert.equal((col.videos?.length ?? 0), 1);
  assert.equal(col.videos?.[0]?.videoId, "testVid001");
  assert.equal(collections.activeCollectionId, collectionId);

  // Remove collection
  const removed = kb.removeCollection(collectionId);
  assert.equal(removed.removed, true);
  assert.equal(removed.chunksDeleted > 0, true);
  assert.equal(removed.videosDeleted, 1);
  assert.equal(removed.clearedActiveCollection, true);

  // Verify removed
  const afterDelete = kb.listCollections();
  assert.equal(afterDelete.collections.length, 0);
  assert.equal(afterDelete.activeCollectionId, undefined);

  kb.close();
});

test("comment KB: active collection management", async () => {
  const kb = makeTestKB();
  const item = sampleComments();

  kb.importComments({ collectionId: "col-a", label: "Collection A" }, [item]);
  kb.importComments({ collectionId: "col-b", label: "Collection B" }, [item]);

  // Set active
  const setResult = kb.setActiveCollection("col-a");
  assert.equal(setResult.activeCollectionId, "col-a");

  // Search scoped to active
  const scopedSearch = await kb.search({ query: "tutorial", maxResults: 3 });
  assert.equal(scopedSearch.searchMeta.scope.mode, "active");
  assert.deepEqual(scopedSearch.searchMeta.scope.searchedCollectionIds, ["col-a"]);

  // Clear active
  const clearResult = kb.clearActiveCollection();
  assert.equal(clearResult.cleared, true);
  assert.equal(clearResult.previousActiveCollectionId, "col-a");

  // Search fans out to all
  const allSearch = await kb.search({ query: "tutorial", maxResults: 10 });
  assert.equal(allSearch.searchMeta.scope.mode, "all_collections");
  assert.equal(allSearch.searchMeta.scope.searchedCollectionIds.length, 2);

  // Explicit collection override
  const explicitSearch = await kb.search({
    query: "tutorial",
    collectionId: "col-b",
    maxResults: 3,
  });
  assert.equal(explicitSearch.searchMeta.scope.mode, "explicit");
  assert.deepEqual(explicitSearch.searchMeta.scope.searchedCollectionIds, ["col-b"]);

  kb.close();
});

test("comment KB: empty/short comments are filtered", async () => {
  const kb = makeTestKB();
  const collectionId = "filter-test";

  kb.importComments({ collectionId }, [{
    videoId: "filterVid",
    videoTitle: "Filter Test",
    channelTitle: "test",
    comments: [
      { author: "A", text: "ok", likeCount: 0 },           // too short
      { author: "B", text: "hi", likeCount: 0 },           // too short
      { author: "C", text: "This is a substantive comment about the video content and quality.", likeCount: 5 },
      { author: "D", text: "", likeCount: 0 },              // empty
    ],
  }]);

  const collections = kb.listCollections();
  const col = collections.collections.find((c) => c.collectionId === collectionId);
  // Only the substantive comment should be indexed
  assert.equal(col?.totalCommentChunks, 1);

  kb.close();
});

test("comment KB: video replacement on re-import", async () => {
  const kb = makeTestKB();
  const collectionId = "reimport-test";

  // First import
  kb.importComments({ collectionId }, [{
    videoId: "vid1",
    videoTitle: "Video 1",
    channelTitle: "test",
    comments: [
      { author: "A", text: "Original comment about the first version of this video.", likeCount: 10 },
    ],
  }]);

  let col = kb.listCollections().collections.find((c) => c.collectionId === collectionId);
  assert.equal(col?.totalCommentChunks, 1);

  // Re-import same video replaces
  kb.importComments({ collectionId }, [{
    videoId: "vid1",
    videoTitle: "Video 1",
    channelTitle: "test",
    comments: [
      { author: "A", text: "Updated comment about the new version of this video.", likeCount: 10 },
      { author: "B", text: "Second comment that was added later to the video.", likeCount: 5 },
    ],
  }]);

  col = kb.listCollections().collections.find((c) => c.collectionId === collectionId);
  assert.equal(col?.totalCommentChunks, 2);

  kb.close();
});

test("comment KB: static ID generation", () => {
  assert.equal(
    CommentKnowledgeBase.videoCommentCollectionId("abc123"),
    "comments-abc123",
  );

  const multi = CommentKnowledgeBase.videosCommentCollectionId(
    ["vid1", "vid2"],
    "My Comments",
  );
  assert.match(multi, /^comments-my-comments-[a-f0-9]{8}$/);
});

test("comment KB: search with video filter", async () => {
  const kb = makeTestKB();
  const collectionId = "filter-vid-test";

  kb.importComments({ collectionId }, [
    {
      videoId: "vid1",
      videoTitle: "Video 1",
      channelTitle: "test",
      comments: [
        { author: "A", text: "Great tutorial about building servers and handling requests properly.", likeCount: 10 },
      ],
    },
    {
      videoId: "vid2",
      videoTitle: "Video 2",
      channelTitle: "test",
      comments: [
        { author: "B", text: "Excellent guide about building client applications and making requests.", likeCount: 5 },
      ],
    },
  ]);

  // Search all
  const allResults = await kb.search({ query: "building", collectionId, maxResults: 10 });
  assert.equal(allResults.results.length, 2);

  // Search with video filter
  const filteredResults = await kb.search({
    query: "building",
    collectionId,
    maxResults: 10,
    videoIdFilter: ["vid1"],
  });
  assert.equal(filteredResults.results.length, 1);
  assert.equal(filteredResults.results[0].videoId, "vid1");

  kb.close();
});
