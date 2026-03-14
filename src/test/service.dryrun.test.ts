import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { YouTubeService } from "../lib/youtube-service.js";

const dataDir = mkdtempSync(join(tmpdir(), "youtube-mcp-dryrun-"));
const service = new YouTubeService({ dryRun: true, dataDir });
const sampleVideo = "dQw4w9WgXcQ";
const sampleChannel = "@GoogleDevelopers";
const samplePlaylist = "PL590L5WQmH8fJ54FNRU3kVZKeTxQqM2C4";

test("V1 and V2 tools return structured dry-run outputs", async () => {
  const [
    search,
    video,
    channel,
    catalog,
    transcript,
    comments,
    sentiment,
    videoSet,
    playlist,
    playlistAnalysis,
    playlistImport,
    videoImport,
    hooks,
    titleResearch,
    formatCompare,
    uploadWindows,
    importReadiness,
    dossier,
    systemHealth,
  ] = await Promise.all([
    service.findVideos({ query: "youtube mcp", maxResults: 3 }),
    service.inspectVideo({ videoIdOrUrl: sampleVideo }),
    service.inspectChannel({ channelIdOrHandleOrUrl: sampleChannel }),
    service.listChannelCatalog({ channelIdOrHandleOrUrl: sampleChannel, maxResults: 3 }),
    service.readTranscript({ videoIdOrUrl: sampleVideo, mode: "key_moments" }),
    service.readComments({ videoIdOrUrl: sampleVideo, maxTopLevel: 3 }),
    service.measureAudienceSentiment({ videoIdOrUrl: sampleVideo, sampleSize: 3 }),
    service.analyzeVideoSet({ videoIdsOrUrls: [sampleVideo], analyses: ["video_info", "transcript", "hook_patterns"] }),
    service.expandPlaylist({ playlistUrlOrId: samplePlaylist, maxVideos: 3 }),
    service.analyzePlaylist({ playlistUrlOrId: samplePlaylist, analyses: ["video_info", "hook_patterns"], maxVideos: 3 }),
    service.importPlaylist({ playlistUrlOrId: samplePlaylist, maxVideos: 2, label: "Dry Run Playlist" }),
    service.importVideos({ videoIdsOrUrls: [sampleVideo], label: "Dry Run Videos" }),
    service.scoreHookPatterns({ videoIdsOrUrls: [sampleVideo] }),
    service.researchTagsAndTitles({ seedTopic: "youtube hooks", maxExamples: 5 }),
    service.compareShortsVsLong({ channelIdOrHandleOrUrl: sampleChannel }),
    service.recommendUploadWindows({ channelIdOrHandleOrUrl: sampleChannel, timezone: "Australia/Sydney" }),
    service.checkImportReadiness({ videoIdOrUrl: sampleVideo }),
    service.buildVideoDossier({ videoIdOrUrl: sampleVideo, commentSampleSize: 3 }),
    service.checkSystemHealth(),
  ]);

  const activated = await service.setActiveCollection({ collectionId: videoImport.collectionId });
  const focusedSearch = await service.searchTranscripts({ query: "title research checklist", maxResults: 3 });
  const collectionList = await service.listCollections({ includeVideoList: true });
  const activeCollection = collectionList.activeCollectionId;
  const globalSearch = await service.searchTranscripts({ query: "title research checklist", maxResults: 3, useActiveCollection: false });
  const cleared = await service.clearActiveCollection();
  const searchAfterClear = await service.searchTranscripts({ query: "title research checklist", maxResults: 3 });

  assert.equal(search.provenance.sourceTier, "none");
  assert.equal(video.video.videoId, sampleVideo);
  assert.equal(channel.channel.title, "Dry-run channel");
  assert.equal(catalog.items.length > 0, true);
  assert.equal(transcript.transcript.mode, "key_moments");
  assert.equal(comments.threads.length, 3);
  assert.equal(typeof sentiment.sentiment.sentimentScore, "number");
  assert.equal(videoSet.processedCount, 1);
  assert.equal(playlist.playlist.playlistId, samplePlaylist);
  assert.equal(playlistAnalysis.run.processed > 0, true);
  assert.equal(playlistImport.import.imported > 0, true);
  assert.equal(videoImport.import.imported > 0, true);
  assert.equal(playlistImport.activeCollectionId, playlistImport.collectionId);
  assert.equal(videoImport.activeCollectionId, videoImport.collectionId);
  assert.equal(collectionList.collections.length >= 2, true);
  assert.equal(activated.activeCollectionId, videoImport.collectionId);
  assert.equal(activeCollection, videoImport.collectionId);
  assert.equal(focusedSearch.results.length > 0, true);
  assert.equal(focusedSearch.searchMeta.scope.mode, "active");
  assert.deepEqual(focusedSearch.searchMeta.scope.searchedCollectionIds, [videoImport.collectionId]);
  assert.equal(globalSearch.results.length > 0, true);
  assert.equal(globalSearch.searchMeta.scope.mode, "all_collections");
  assert.equal(cleared.cleared, true);
  assert.equal(searchAfterClear.searchMeta.scope.mode, "all_collections");
  assert.equal(hooks.videos[0]?.hookType !== undefined, true);
  assert.equal(titleResearch.examples.length > 0, true);
  assert.equal(formatCompare.recommendation.rationale.length > 0, true);
  assert.equal(uploadWindows.recommendedSlots.length > 0, true);
  assert.equal(importReadiness.importReadiness.canImport, true);
  assert.equal(importReadiness.transcript.available, true);
  assert.equal(dossier.video.videoId, sampleVideo);
  assert.equal(dossier.comments?.totalFetched, 3);
  assert.equal(dossier.audienceSentiment !== undefined, true);
  assert.equal(systemHealth.overallStatus, "ready");

  // V3 Trends & Discovery dry-run
  const trends = await service.discoverNicheTrends({ niche: "AI coding tools" });
  assert.equal(trends.niche, "AI coding tools");
  assert.equal(trends.trendingVideos.length > 0, true);
  assert.ok(["accelerating", "steady", "decelerating", "insufficient_data"].includes(trends.momentum.recencyBias));
  assert.ok(["low", "medium", "high", "insufficient_data"].includes(trends.saturation.saturationLevel));
  assert.equal(Array.isArray(trends.contentGaps), true);
  assert.equal(Array.isArray(trends.recurringKeywords), true);
  assert.equal(Array.isArray(trends.titlePatterns), true);
  assert.equal(typeof trends.formatBreakdown.shortsPct, "number");
  assert.equal(trends.limitations.length > 0, true);
  assert.equal(trends.provenance.sourceTier, "none");

  const competitors = await service.exploreNicheCompetitors({ niche: "AI coding tools" });
  assert.equal(competitors.niche, "AI coding tools");
  assert.equal(competitors.competitors.length > 0, true);
  assert.equal(typeof competitors.landscape.totalChannelsSampled, "number");
  assert.equal(competitors.limitations.length > 0, true);
});
