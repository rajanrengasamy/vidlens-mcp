# YouTube MCP Server - Product Requirements Document (PRD)

**Author:** Rajan Rengasamy
**Date:** 2026-03-05
**Status:** Draft v2.1 (updated: V2.16 — tonight's shipped V2 build: active collection, diagnostics, dossier, doctor CLI, client detection scaffolding, packaging/install UX)
**Product Type:** Standalone TypeScript MCP server (stdio + SSE), npm-publishable

---

## 1) Executive Summary

I am building a **YouTube MCP server** that acts as an **intelligence layer**, not just an API wrapper. My goal is to make YouTube analysis reliable, useful, and token-efficient for MCP-native workflows.

Most current YouTube MCP servers fail at one or more of these fundamentals:

- They require a YouTube API key to do anything useful.
- They break hard when quota is exhausted or credentials fail.
- They return raw or semi-raw payloads instead of analytical output.
- They name tools after backend endpoints, not user intent.
- They waste context windows with verbose response objects.

My server differentiates on five pillars:

1. **Zero-config start** - works immediately with `yt-dlp` and page extraction even without API keys.
2. **Fallback chain on every tool** - YouTube Data API v3 → `yt-dlp` → page extraction → graceful error.
3. **Intelligence layer** - sentiment scoring, content-gap detection, benchmark analysis, growth signals.
4. **Persona-aware tool naming** - tools are named for outcomes users want.
5. **Token-optimized responses** - structured compact outputs targeting **75-87% token savings** vs raw API payloads.

I will deliver this in three phases:

- **V1:** Core data + fallback + comment sentiment + **playlist imports + semantic search across indexed transcripts**.
- **V2:** Creator workflows (gaps, hooks, tags, timing, format comparison).
- **V3:** Competitor and brand intelligence (benchmarks, share of voice, growth trajectory, sponsored pattern detection).

---

## 2) Problem Statement

Today, YouTube MCP tooling has a usability and reliability gap:

- **Reliability gap:** API-only designs fail in quota exhaustion, missing credentials, or endpoint errors.
- **Usability gap:** users ask strategic questions, but tools return low-level data fragments.
- **Efficiency gap:** payloads are often too large for iterative LLM workflows.
- **Workflow gap:** creators, researchers, and brand builders need different abstractions, but tools are mostly endpoint-centric.

### Core Problems I am Solving

1. **Cold start friction**
   - Current: user must configure API keys up front.
   - My design: user gets value immediately with `yt-dlp`/extraction fallback.

2. **Single-point failure**
   - Current: API outage = broken toolchain.
   - My design: layered fallback and source provenance so outputs degrade gracefully.

3. **Data without judgment**
   - Current: "here are comments/transcripts."
   - My design: "here is sentiment trend, risk cluster, and content gap opportunity."

4. **Context window waste**
   - Current: big nested JSON, thumbnails, etags, repeated metadata.
   - My design: compact typed objects, optional verbosity, field-selective output.

---

## 3) Competitive Analysis

I reviewed live/community YouTube MCP servers and adjacent offerings. The market is active, but no product currently combines reliability + intelligence + zero-config + compact output in one cohesive design.

| Server | Strengths | Gaps I observed | Strategic opportunity for this product |
|---|---|---|---|
| `anaisbetts/mcp-youtube` | Very simple, quick subtitle retrieval via `yt-dlp` | Transcript-only scope; no stats/comments/search/benchmarking | Keep transcript convenience but expand to full analysis suite |
| `kirbah/mcp-youtube` | Best-in-class token optimization, strong engineering quality, caching, tests | API key required; no fallback chain; limited intelligence tooling | Match compactness and exceed on resilience + insights |
| `ZubeidHendricks/youtube-mcp-server` | Broad feature list (videos/channels/playlists/search) | API v3 dependency; brittle without credentials/quota; mostly retrieval-focused | Add fallback resilience + analysis-first outputs |
| `nattyraz/youtube-mcp` | Metadata + captions + markdown templates | Credential heavy; little strategic analytics | Build beyond extraction into decision-grade insights |
| `mourad-ghafiri/youtube-mcp-server` | Strong transcription pipeline, multilingual support, VAD/Whisper integration | Primarily transcription/metadata focus; limited channel/market intelligence | Keep multilingual strength as optional extension, focus on strategy layer |
| `kimtaeyoon83/mcp-server-youtube-transcript` | Clean transcript retrieval, ad-strip option | Narrow scope; no channel intelligence or benchmarking | Integrate transcript tools into broader intelligence suite |
| `aardeshir/youtube-mcp` | Playlist/channel operations with OAuth flows | Setup complexity; API/OAuth dependency; limited analysis layer | Simplify onboarding and prioritize insight-oriented tools |
| `eat-pray-ai/yutu` | Powerful operational automation and publishing workflows | Heavy auth setup and operational breadth; not optimized for lightweight analysis context | Position as lightweight intelligence server, not full channel ops platform |

### Competitive Conclusion

I see clear whitespace: **no existing server combines zero-config startup, universal fallback, sentiment+competitive intelligence, and aggressive token optimization** as first-class design goals.

---

## 4) Target Personas

### Persona 1 - YouTube Creator

**What they need to do:**
- Find content gaps
- Mine comment sentiment
- Evaluate hooks
- Optimize upload timing
- Compare Shorts vs long-form performance
- Improve tags/title discoverability

**Pain points:**
- Tooling tells them what happened, not what to do next.
- Manual transcript/comment review is slow and noisy.

**Success looks like:**
- Faster content ideation cycles
- Better retention hooks and audience response
- More predictable publishing decisions

---

### Persona 2 - Competitor Researcher

**What they need to do:**
- Compare channels
- Estimate share of voice
- Benchmark engagement quality
- Track growth trajectory
- Detect sponsorship patterns
- Reverse-engineer strategy

**Pain points:**
- Data collection is fragmented across many tools.
- Apples-to-apples benchmark normalization is hard.

**Success looks like:**
- One-call comparative analysis
- Time-series and normalized benchmark outputs
- Reusable market snapshots

---

### Persona 3 - Brand Builder

**What they need to do:**
- Validate niche demand
- Find audience overlap/collaboration candidates
- Track milestone benchmarks
- Identify repurpose signals
- Assess monetization readiness

**Pain points:**
- They need strategic signal, not channel-ops plumbing.

**Success looks like:**
- Better go/no-go decisions on niche/channel direction
- More confidence in positioning and partnership choices

---

## 5) Product Vision

I am building a YouTube intelligence backend for MCP clients with these principles:

1. **Reliable by default** - every tool has a source fallback path.
2. **Useful by default** - outputs answer decisions, not just retrieval requests.
3. **Compact by default** - small, structured responses that fit iterative workflows.
4. **Transparent by default** - provenance tells users which source path was used.
5. **Extensible by default** - architecture supports new analyzers and transports.

### Non-Goals (V1-V3)

- Full YouTube publishing automation (upload/update/comment posting)
- Video editing/render pipelines
- Ads campaign management

---

## 6) Feature Specification (Tool Catalog + Schemas)

I am naming tools by user intent. All schemas below are implementation-ready TypeScript interfaces and map directly to Zod validators.

### 6.1 Shared Types

```ts
export type SourceTier = "youtube_api" | "yt_dlp" | "page_extract" | "none";

export interface Provenance {
  sourceTier: SourceTier;
  sourceNotes?: string[];
  fetchedAt: string; // ISO-8601
  fallbackDepth: 0 | 1 | 2 | 3;
  partial: boolean;
}

export interface Pagination {
  nextPageToken?: string;
  prevPageToken?: string;
}

export interface TimeRange {
  from?: string; // ISO-8601
  to?: string;   // ISO-8601
}

export interface TokenControls {
  compact?: boolean; // default true
  includeRaw?: boolean; // default false
  fields?: string[]; // selective projection
}
```

---

### 6.2 V1 Tools (Core Data + Fallback + Sentiment)

#### Tool: `findVideos`

```ts
export interface FindVideosInput extends TokenControls {
  query: string;
  maxResults?: number; // 1..50 default 10
  order?: "relevance" | "date" | "viewCount" | "rating";
  regionCode?: string; // ISO country
  publishedAfter?: string; // ISO-8601
  publishedBefore?: string; // ISO-8601
  channelId?: string;
  duration?: "any" | "short" | "medium" | "long";
}

export interface FindVideosOutput {
  query: string;
  results: Array<{
    videoId: string;
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt?: string;
    durationSec?: number;
    views?: number;
    engagementRate?: number; // normalized when possible
  }>;
  pagination?: Pagination;
  provenance: Provenance;
}
```

#### Tool: `inspectVideo`

```ts
export interface InspectVideoInput extends TokenControls {
  videoIdOrUrl: string;
  includeTranscriptMeta?: boolean; // default true
  includeEngagementRatios?: boolean; // default true
}

export interface InspectVideoOutput {
  video: {
    videoId: string;
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt?: string;
    durationSec?: number;
    category?: string;
    tags?: string[];
    language?: string;
  };
  stats: {
    views?: number;
    likes?: number;
    comments?: number;
    likeRate?: number;
    commentRate?: number;
    viewVelocity24h?: number;
  };
  transcriptMeta?: {
    available: boolean;
    languages?: string[];
  };
  provenance: Provenance;
}
```

#### Tool: `inspectChannel`

```ts
export interface InspectChannelInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
}

export interface InspectChannelOutput {
  channel: {
    channelId: string;
    title: string;
    handle?: string;
    createdAt?: string;
    country?: string;
    descriptionSummary?: string;
  };
  stats: {
    subscribers?: number;
    totalViews?: number;
    totalVideos?: number;
    avgViewsPerVideo?: number;
  };
  cadence: {
    uploadsLast30d?: number;
    uploadsLast90d?: number;
    medianDaysBetweenUploads?: number;
  };
  provenance: Provenance;
}
```

#### Tool: `listChannelCatalog`

```ts
export interface ListChannelCatalogInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  maxResults?: number; // 1..100 default 25
  sortBy?: "date_desc" | "date_asc" | "views_desc";
  includeShorts?: boolean; // default true
  includeLongForm?: boolean; // default true
  publishedWithinDays?: number;
}

export interface ListChannelCatalogOutput {
  channelId: string;
  items: Array<{
    videoId: string;
    title: string;
    publishedAt?: string;
    durationSec?: number;
    format: "short" | "long" | "unknown";
    views?: number;
    likes?: number;
    comments?: number;
  }>;
  pagination?: Pagination;
  provenance: Provenance;
}
```

#### Tool: `readTranscript`

```ts
export interface ReadTranscriptInput extends TokenControls {
  videoIdOrUrl: string;
  language?: string; // preferred language code
  mode?: "full" | "summary" | "key_moments" | "chapters"; // default key_moments
  includeTimestamps?: boolean; // default true
  chunkWindowSec?: number; // for key_moments mode
  // Long-video pagination (only applies when mode="full")
  offset?: number; // character offset to start from, default 0
  limit?: number; // max characters to return, default 32000 (~8K tokens)
}

export interface ReadTranscriptOutput {
  videoId: string;
  languageUsed?: string;
  transcript: {
    mode: "full" | "summary" | "key_moments" | "chapters";
    text?: string; // summary/full when compact=false
    segments?: Array<{
      tStartSec: number;
      tEndSec?: number;
      text: string;
      topicLabel?: string;
      chapterTitle?: string; // populated when mode="chapters"
    }>;
  };
  // Long-video metadata
  longVideoHandling?: {
    totalCharacters: number;
    totalEstimatedTokens: number;
    autoDowngraded: boolean; // true if mode was auto-switched from "full" due to length
    originalMode?: string; // what the user requested before auto-downgrade
    pagination?: {
      offset: number;
      limit: number;
      hasMore: boolean;
      nextOffset?: number;
    };
  };
  chapters?: Array<{
    title: string;
    tStartSec: number;
    tEndSec?: number;
  }>;
  quality: {
    sourceType: "manual_caption" | "auto_caption" | "generated_from_audio" | "unknown";
    confidence?: number; // 0..1
  };
  provenance: Provenance;
}
```

**Long-video safeguards (auto-applied):**
- If transcript exceeds 32,000 characters (~8K tokens), `mode="full"` is auto-downgraded to `mode="key_moments"` with `longVideoHandling.autoDowngraded = true` and the original mode preserved.
- The LLM can override by explicitly requesting `mode="full"` with `offset` and `limit` to paginate through long transcripts in chunks.
- `mode="chapters"` uses YouTube chapter markers from the video description as natural segment boundaries - ideal for lectures and tutorials.
- All modes return `longVideoHandling` metadata so the LLM knows the total length and can decide whether to paginate or summarize.
```

#### Tool: `readComments`

```ts
export interface ReadCommentsInput extends TokenControls {
  videoIdOrUrl: string;
  maxTopLevel?: number; // 1..200 default 50
  includeReplies?: boolean; // default false
  maxRepliesPerThread?: number; // 0..20
  order?: "relevance" | "time";
  languageHint?: string;
}

export interface ReadCommentsOutput {
  videoId: string;
  totalFetched: number;
  threads: Array<{
    commentId: string;
    author: string;
    text: string;
    likeCount?: number;
    publishedAt?: string;
    replies?: Array<{
      commentId: string;
      author: string;
      text: string;
      likeCount?: number;
      publishedAt?: string;
    }>;
  }>;
  pagination?: Pagination;
  provenance: Provenance;
}
```

#### Tool: `measureAudienceSentiment`

```ts
export interface MeasureAudienceSentimentInput extends TokenControls {
  videoIdOrUrl: string;
  sampleSize?: number; // default 200 comments
  includeThemes?: boolean; // default true
  includeRepresentativeQuotes?: boolean; // default true
}

export interface MeasureAudienceSentimentOutput {
  videoId: string;
  sampleSize: number;
  sentiment: {
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    sentimentScore: number; // -100..100
  };
  themes?: Array<{
    theme: string;
    prevalencePct: number;
    sentimentScore: number; // -100..100
  }>;
  riskSignals?: Array<{
    signal: string;
    severity: "low" | "medium" | "high";
    frequencyPct: number;
  }>;
  representativeQuotes?: Array<{
    text: string;
    sentiment: "positive" | "neutral" | "negative";
  }>;
  provenance: Provenance;
}
```

#### Tool: `watchTopicTrends`

```ts
export interface WatchTopicTrendsInput extends TokenControls {
  topic: string;
  regionCode?: string;
  maxResults?: number; // 1..50
  lookbackDays?: number; // default 30
}

export interface WatchTopicTrendsOutput {
  topic: string;
  summary: {
    trendDirection: "up" | "flat" | "down";
    medianViews?: number;
    medianComments?: number;
    postingVelocity?: number; // videos/day in sample
  };
  leadingVideos: Array<{
    videoId: string;
    title: string;
    channelTitle: string;
    views?: number;
    publishedAt?: string;
  }>;
  provenance: Provenance;
}
```

---

### 6.2.1 Batch + Playlist Operations (Added for Multi-Video Workflows)

These tools are required so MCP clients (Claude Code, ChatGPT desktop, etc.) can analyze multiple videos or playlist URLs in one reliable call instead of relying on fragile client-side fan-out.

#### Tool: `analyzeVideoSet`

```ts
export type VideoAnalysisMode =
  | "video_info"
  | "transcript"
  | "comments"
  | "sentiment"
  | "hook_patterns"
  | "tag_title_patterns";

export interface AnalyzeVideoSetInput extends TokenControls {
  videoIdsOrUrls: string[]; // 1..20
  analyses: VideoAnalysisMode[]; // at least one
  commentsSampleSize?: number; // default 50 per video when comments/sentiment requested
  transcriptMode?: "summary" | "key_moments" | "full"; // default key_moments
}

export interface AnalyzeVideoSetOutput {
  requestedCount: number;
  processedCount: number;
  failedCount: number;
  items: Array<{
    videoId: string;
    analyses: {
      videoInfo?: InspectVideoOutput;
      transcript?: ReadTranscriptOutput;
      comments?: ReadCommentsOutput;
      sentiment?: MeasureAudienceSentimentOutput;
      hookPatterns?: {
        hookScore: number;
        hookType: "question" | "promise" | "shock" | "story" | "proof" | "other";
        first30SecSummary: string;
      };
      tagTitlePatterns?: {
        recurringKeywords: string[];
        titleStructure: string[];
      };
    };
    errors?: GracefulError[];
    provenance: Provenance;
  }>;
  summary: {
    successRatePct: number;
    avgFallbackDepth: number;
  };
}
```

#### Tool: `expandPlaylist`

```ts
export interface ExpandPlaylistInput extends TokenControls {
  playlistUrlOrId: string;
  maxVideos?: number; // 1..200 default 50
  includeVideoMeta?: boolean; // default false
}

export interface ExpandPlaylistOutput {
  playlist: {
    playlistId: string;
    title?: string;
    channelTitle?: string;
    videoCountReported?: number;
  };
  videos: Array<{
    videoId: string;
    title?: string;
    publishedAt?: string;
    channelTitle?: string;
  }>;
  truncated: boolean;
  provenance: Provenance;
}
```

#### Tool: `analyzePlaylist`

```ts
export interface AnalyzePlaylistInput extends TokenControls {
  playlistUrlOrId: string;
  analyses: VideoAnalysisMode[]; // at least one
  maxVideos?: number; // 1..100 default 25
  commentsSampleSize?: number;
  transcriptMode?: "summary" | "key_moments" | "full";
}

export interface AnalyzePlaylistOutput {
  playlist: {
    playlistId: string;
    title?: string;
    channelTitle?: string;
  };
  run: {
    maxVideos: number;
    processed: number;
    failed: number;
  };
  items: AnalyzeVideoSetOutput["items"];
  aggregate: {
    medianViews?: number;
    avgSentimentScore?: number;
    dominantThemes?: string[];
    hookBenchmark?: {
      medianHookScore?: number;
      topQuartileHookScore?: number;
    };
  };
  provenance: Provenance;
}
```

### Batch/Fallback Contract for these tools
- Use the same fallback chain per video item: `youtube_api -> yt_dlp -> page_extract -> graceful error`.
- Partial success is allowed: one failed video must not fail the full batch.
- Each item returns its own `errors[]` and `provenance`.

---

### 6.2.2 Playlist Import + Semantic Search (V1 - Core Feature)

These tools are the primary differentiator. No other TypeScript YouTube MCP server offers playlist-level ingestion with semantic search across indexed transcripts. This is the "knowledge base" workflow: import a playlist → index all transcripts → search across them semantically.

**Use cases driving this:**
- "Here's my playlist of 20 Stanford CS229 lectures - find every mention of gradient descent across all of them"
- "Import this playlist of product management talks and search for advice on prioritization frameworks"
- "Index a creator's entire upload history and find patterns in their content strategy"

**Architecture decision:** Use `sqlite-vec` (SQLite vector extension) for the embedding store. This keeps the zero-config philosophy - no external database required. Embeddings are stored alongside the cache in the same SQLite database. For users who want scale, the store interface supports pluggable backends (ChromaDB, Postgres+pgvector).

**Embedding model:** Use a small, fast, local embedding model by default (e.g., `@xenova/transformers` with `all-MiniLM-L6-v2`, ~80MB). No API key needed. Optional override to use OpenAI `text-embedding-3-small` or similar when configured.

#### Tool: `importPlaylist`

Ingests all videos in a playlist: fetches transcripts, chunks them, generates embeddings, and stores them in the local vector index. This is the entry point for building a searchable knowledge base from YouTube content.

```ts
export interface ImportPlaylistInput extends TokenControls {
  playlistUrlOrId: string;
  maxVideos?: number; // 1..500 default 50
  chunkStrategy?: "time_window" | "chapters" | "auto"; // default "auto" - uses chapters when available, falls back to time_window
  chunkSizeSec?: number; // transcript chunk window in seconds, default 120 (for time_window strategy)
  chunkOverlapSec?: number; // overlap between chunks, default 30
  language?: string; // preferred transcript language
  reindexExisting?: boolean; // default false - skip already-indexed videos
  label?: string; // optional human-readable name for this collection
}

export interface ImportPlaylistOutput {
  playlist: {
    playlistId: string;
    title?: string;
    channelTitle?: string;
    videoCountReported?: number;
  };
  import: {
    totalVideos: number;
    imported: number;
    skipped: number; // already indexed
    failed: number;
    chunksCreated: number;
    embeddingsGenerated: number;
  };
  failures?: Array<{
    videoId: string;
    reason: string;
  }>;
  collectionId: string; // internal ID for this indexed collection
  provenance: Provenance;
}
```

#### Tool: `importVideos`

Same as `importPlaylist` but for ad-hoc video sets (not tied to a playlist). Useful for "index these 5 specific videos."

```ts
export interface ImportVideosInput extends TokenControls {
  videoIdsOrUrls: string[]; // 1..50
  chunkSizeSec?: number; // default 120
  chunkOverlapSec?: number; // default 30
  language?: string;
  collectionId?: string; // add to existing collection, or create new
  label?: string;
}

export interface ImportVideosOutput {
  import: {
    totalVideos: number;
    imported: number;
    skipped: number;
    failed: number;
    chunksCreated: number;
    embeddingsGenerated: number;
  };
  failures?: Array<{
    videoId: string;
    reason: string;
  }>;
  collectionId: string;
  provenance: Provenance;
}
```

#### Tool: `searchTranscripts`

Semantic search across all indexed video transcripts. Returns ranked results with source video, timestamp, and surrounding context. This is the core "ask questions across your video library" tool.

```ts
export interface SearchTranscriptsInput extends TokenControls {
  query: string;
  collectionId?: string; // search specific collection, or all if omitted
  maxResults?: number; // 1..50 default 10
  minScore?: number; // 0..1 similarity threshold, default 0.5
  videoIdFilter?: string[]; // restrict to specific videos within collection
}

export interface SearchTranscriptsOutput {
  query: string;
  results: Array<{
    videoId: string;
    videoTitle: string;
    channelTitle?: string;
    chunkText: string;
    tStartSec: number;
    tEndSec: number;
    timestampUrl: string; // deep link: https://youtu.be/{id}?t={sec}
    score: number; // 0..1 similarity
    context?: {
      prevChunkText?: string;
      nextChunkText?: string;
    };
  }>;
  searchMeta: {
    totalChunksSearched: number;
    embeddingModel: string;
    searchLatencyMs: number;
  };
  provenance: Provenance;
}
```

#### Tool: `listCollections`

List all indexed collections (playlists/video sets) with stats.

```ts
export interface ListCollectionsInput extends TokenControls {
  includeVideoList?: boolean; // default false
}

export interface ListCollectionsOutput {
  collections: Array<{
    collectionId: string;
    label?: string;
    sourcePlaylistId?: string;
    videoCount: number;
    totalChunks: number;
    createdAt: string;
    lastUpdatedAt: string;
  }>;
  provenance: Provenance;
}
```

#### Tool: `removeCollection`

Delete an indexed collection and its embeddings.

```ts
export interface RemoveCollectionInput {
  collectionId: string;
}

export interface RemoveCollectionOutput {
  removed: boolean;
  collectionId: string;
  chunksDeleted: number;
}
```

---

### 6.2.3 Video Download (V1 - Opt-in Tool)

Video downloading is an opt-in capability. It is NOT registered by default - users must explicitly enable it via config (`enableDownload: true`) to keep the default tool surface lean and avoid legal concerns for users who don't want it.

**How MCP tool configuration works for the LLM:** MCP servers declare their tools at startup. The LLM (Claude, ChatGPT, etc.) sees a list of available tools with descriptions and schemas. It picks the right tool based on what the user asks. So if `downloadVideo` is enabled, the LLM will see it alongside `readTranscript`, `searchTranscripts`, etc. and use it when the user says "download this video." The user never writes JSON - they just ask in natural language.

#### Tool: `downloadVideo`

```ts
export interface DownloadVideoInput {
  videoIdOrUrl: string;
  format?: "mp4" | "webm" | "mp3" | "m4a" | "wav"; // default "mp4"
  quality?: "best" | "1080p" | "720p" | "480p" | "audio_only"; // default "720p"
  outputDir?: string; // default: OS temp dir or configurable base path
  filenameTemplate?: string; // yt-dlp template, default "%(title)s.%(ext)s"
}

export interface DownloadVideoOutput {
  videoId: string;
  title: string;
  filePath: string;
  fileSize: number; // bytes
  format: string;
  quality: string;
  durationSec?: number;
  provenance: Provenance;
}
```

**Configuration:** Enabled via environment variable `YOUTUBE_MCP_ENABLE_DOWNLOAD=true` or MCP server config. When disabled, the tool is not registered and invisible to the LLM.

---

### 6.3 V2 Tools (Creator Intelligence)

#### Tool: `findContentGaps`

```ts
export interface FindContentGapsInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  nicheKeywords: string[];
  lookbackDays?: number; // default 180
  competitorChannelIds?: string[];
}

export interface FindContentGapsOutput {
  channelId: string;
  opportunities: Array<{
    gapTopic: string;
    demandScore: number; // 0..100
    competitionScore: number; // 0..100
    opportunityScore: number; // 0..100
    suggestedAngles: string[];
  }>;
  evidence: {
    undercoveredKeywords: string[];
    missedFormats: Array<"tutorial" | "review" | "case_study" | "reaction" | "short" | "long">;
  };
  provenance: Provenance;
}
```

#### Tool: `scoreHookPatterns`

```ts
export interface ScoreHookPatternsInput extends TokenControls {
  videoIdsOrUrls: string[]; // up to 20
  hookWindowSec?: number; // default 30
}

export interface ScoreHookPatternsOutput {
  videos: Array<{
    videoId: string;
    hookScore: number; // 0..100
    hookType: "question" | "promise" | "shock" | "story" | "proof" | "other";
    first30SecSummary: string;
    weakSignals: string[];
    improvements: string[];
  }>;
  benchmark: {
    medianHookScore: number;
    topQuartileHookScore: number;
  };
  provenance: Provenance;
}
```

#### Tool: `recommendUploadWindows`

```ts
export interface RecommendUploadWindowsInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  timezone: string; // IANA TZ
  lookbackDays?: number; // default 120
}

export interface RecommendUploadWindowsOutput {
  channelId: string;
  recommendedSlots: Array<{
    weekday: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
    hourLocal: number; // 0..23
    confidence: number; // 0..1
    rationale: string;
  }>;
  observedPatterns: {
    bestDay?: string;
    bestHour?: number;
    consistencyScore?: number; // 0..100
  };
  provenance: Provenance;
}
```

#### Tool: `compareShortsVsLong`

```ts
export interface CompareShortsVsLongInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  lookbackDays?: number; // default 180
}

export interface CompareShortsVsLongOutput {
  channelId: string;
  shorts: {
    count: number;
    medianViews?: number;
    medianEngagementRate?: number;
    medianCommentRate?: number;
  };
  longForm: {
    count: number;
    medianViews?: number;
    medianEngagementRate?: number;
    medianCommentRate?: number;
  };
  recommendation: {
    suggestedMixShortPct: number; // 0..100
    suggestedMixLongPct: number; // 0..100
    rationale: string[];
  };
  provenance: Provenance;
}
```

#### Tool: `researchTagsAndTitles`

```ts
export interface ResearchTagsAndTitlesInput extends TokenControls {
  seedTopic: string;
  regionCode?: string;
  language?: string;
  maxExamples?: number; // default 20
}

export interface ResearchTagsAndTitlesOutput {
  seedTopic: string;
  winningPatterns: {
    titleStructures: string[];
    recurringKeywords: string[];
    highSignalTags: string[];
    lowSignalTags: string[];
  };
  examples: Array<{
    videoId: string;
    title: string;
    tags?: string[];
    views?: number;
    engagementRate?: number;
  }>;
  provenance: Provenance;
}
```

---

### 6.4 V3 Tools (Competitor + Brand Intelligence)

#### Tool: `benchmarkChannels`

```ts
export interface BenchmarkChannelsInput extends TokenControls {
  channelIdsOrHandles: string[]; // 2..10
  lookbackDays?: number; // default 180
  normalizeBySubscribers?: boolean; // default true
}

export interface BenchmarkChannelsOutput {
  channels: Array<{
    channelId: string;
    title: string;
    subscribers?: number;
    uploads: number;
    medianViews?: number;
    medianEngagementRate?: number;
    growthRate30d?: number;
    benchmarkScore: number; // 0..100
  }>;
  leaders: {
    byViews: string;
    byEngagement: string;
    byGrowth: string;
  };
  provenance: Provenance;
}
```

#### Tool: `measureShareOfVoice`

```ts
export interface MeasureShareOfVoiceInput extends TokenControls {
  topicKeywords: string[];
  channelIdsOrHandles: string[]; // candidate set
  lookbackDays?: number; // default 90
  regionCode?: string;
}

export interface MeasureShareOfVoiceOutput {
  topicKeywords: string[];
  totalSampleVideos: number;
  channels: Array<{
    channelId: string;
    mentionSharePct: number; // topic presence
    viewSharePct: number;
    engagementSharePct: number;
    weightedSovPct: number;
  }>;
  concentration: {
    top3WeightedSovPct: number;
    fragmentationIndex: number; // 0..100
  };
  provenance: Provenance;
}
```

#### Tool: `mapGrowthTrajectory`

```ts
export interface MapGrowthTrajectoryInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  lookbackDays?: number; // default 365
  granularity?: "weekly" | "monthly"; // default weekly
}

export interface MapGrowthTrajectoryOutput {
  channelId: string;
  trajectory: Array<{
    periodStart: string;
    uploads: number;
    medianViews?: number;
    medianEngagementRate?: number;
    momentumScore: number; // -100..100
  }>;
  inflectionPoints: Array<{
    periodStart: string;
    reasonHypothesis: string;
    impactScore: number; // 0..100
  }>;
  forwardSignal: {
    shortTermOutlook: "accelerating" | "stable" | "decelerating";
    confidence: number; // 0..1
  };
  provenance: Provenance;
}
```

#### Tool: `detectSponsoredContent`

```ts
export interface DetectSponsoredContentInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  lookbackVideos?: number; // default 50
}

export interface DetectSponsoredContentOutput {
  channelId: string;
  estimatedSponsoredPct: number; // 0..100
  flaggedVideos: Array<{
    videoId: string;
    title: string;
    confidence: number; // 0..1
    detectedSignals: string[]; // disclosure keywords, CTA patterns, links
  }>;
  sponsorCategories: Array<{
    category: string;
    prevalencePct: number;
  }>;
  provenance: Provenance;
}
```

#### Tool: `findAudienceOverlap`

```ts
export interface FindAudienceOverlapInput extends TokenControls {
  seedChannelIdOrHandle: string;
  candidateChannelIdsOrHandles: string[];
  lookbackDays?: number; // default 180
}

export interface FindAudienceOverlapOutput {
  seedChannelId: string;
  overlaps: Array<{
    candidateChannelId: string;
    overlapScore: number; // 0..100
    evidenceSignals: string[]; // shared commenters, keyword clusters, format similarity
    collaborationFit: "low" | "medium" | "high";
  }>;
  topCollabCandidates: string[];
  provenance: Provenance;
}
```

#### Tool: `assessMonetizationReadiness`

```ts
export interface AssessMonetizationReadinessInput extends TokenControls {
  channelIdOrHandleOrUrl: string;
  lookbackDays?: number; // default 180
}

export interface AssessMonetizationReadinessOutput {
  channelId: string;
  readinessScore: number; // 0..100
  dimensions: {
    consistencyScore: number;
    engagementQualityScore: number;
    nicheClarityScore: number;
    brandSafetyScore: number;
    audienceIntentScore: number;
  };
  recommendations: Array<{
    priority: "P0" | "P1" | "P2";
    action: string;
    expectedImpact: string;
  }>;
  provenance: Provenance;
}
```

---

## 7) Technical Architecture

### 7.1 Stack

- **Language:** TypeScript (Node 20+)
- **MCP SDK:** official TS MCP SDK
- **Transports:**
  - `stdio` (local desktop clients)
  - `SSE` (remote/self-hosted mode)
- **Data Sources:**
  - YouTube Data API v3 (primary when configured)
  - `yt-dlp` (secondary retrieval path)
  - Page extraction parser (tertiary fallback)
- **Vector / Embedding:**
  - `sqlite-vec` (default, zero-config - embeddings stored in same SQLite as cache)
  - `@xenova/transformers` with `all-MiniLM-L6-v2` for local embeddings (~80MB, no API key)
  - Optional: OpenAI `text-embedding-3-small` when `OPENAI_API_KEY` is set
  - Pluggable backend interface for ChromaDB, Postgres+pgvector
- **Packaging:** npm package (single binary entry + server mode)

### 7.2 Services

- `SourceOrchestrator` - executes fallback chain and source selection
- `YouTubeApiAdapter` - typed wrapper for v3 endpoints
- `YtDlpAdapter` - metadata/transcript/comment extraction
- `PageExtractAdapter` - HTML/JSON-LD extraction from watch/channel pages
- `Normalizer` - canonical schema mapping across all source tiers
- `Analyzer` - sentiment, hooks, gaps, benchmarks, overlap, readiness scoring
- `TokenCompressor` - field pruning, numeric compaction, optional summaries
- `CacheStore` - TTL-based cache (SQLite default, pluggable Postgres/Redis)
- `VectorStore` - embedding index for semantic search (sqlite-vec default, pluggable ChromaDB/pgvector)
- `Embedder` - text → vector pipeline (local Xenova/transformers default, optional OpenAI)
- `TranscriptChunker` - splits transcripts into overlapping time-windowed chunks for indexing
- `CollectionManager` - manages playlist/video-set collections and their lifecycle
- `Telemetry` - latency, fallback depth, error rates, token savings

### 7.3 Caching Strategy

- Query-level and entity-level cache keys
- Default TTLs:
  - Search/trending: 15 min
  - Video/channel metadata: 6 hours
  - Transcript/comments: 24 hours
  - Analyzer outputs: 2 hours (invalidated by upstream changes)
  - Vector embeddings: persistent (no TTL - transcript content doesn't change)
  - Collection metadata: persistent (user-managed lifecycle via `removeCollection`)

### 7.4 Security and Privacy

- Credentials loaded from env only
- No secrets persisted in logs
- Configurable telemetry redaction mode
- Rate-limit guardrails to avoid accidental API quota burn

---

## 8) Fallback Chain Design

Every tool call follows this deterministic strategy:

1. **Tier 1 - YouTube Data API v3**
   - Use when credentials are present and quota allows.
   - Highest structure and speed for search/channel/video stats.

2. **Tier 2 - `yt-dlp`**
   - Used when API key missing, quota exceeded, or endpoint error.
   - Great for metadata and transcripts.

3. **Tier 3 - Page extraction**
   - Parse public page artifacts (JSON-LD / script payloads / HTML sections).
   - Lower confidence for some metrics; marked as partial where needed.

4. **Tier 4 - Graceful error**
   - If all tiers fail, return actionable error with next-step guidance.
   - Never return empty opaque failure.

### Error Contract

```ts
export interface GracefulError {
  code:
    | "INVALID_INPUT"
    | "NOT_FOUND"
    | "RATE_LIMITED"
    | "UPSTREAM_UNAVAILABLE"
    | "INSUFFICIENT_PUBLIC_DATA"
    | "INTERNAL_ERROR";
  message: string;
  retryable: boolean;
  attemptedTiers: SourceTier[];
  suggestion?: string;
}
```

### Fallback Acceptance Targets

- ≥95% successful response rate across all calls (including fallback success)
- ≤1% hard failures due to source unavailability
- Provenance attached in 100% of responses

---

## 9) Token Optimization Design

I will treat token efficiency as a product feature.

### Compression Rules

- `compact: true` by default
- drop heavy low-value fields (e.g., thumbnails, etags, redundant nested metadata)
- fixed small key schema (`videoId`, `views`, `engagementRate`, etc.)
- numeric normalization (ratios/scores precomputed)
- field projection (`fields[]`) for selective output
- optional verbose mode (`includeRaw=true`) for debugging only

### Expected Savings (target)

- `inspectVideo`: **~75%** reduction vs raw API object
- `inspectChannel`: **~87%** reduction vs raw API object
- `findVideos`: **~64%** reduction vs raw API list payload

### Verification Plan

- Built-in benchmark harness comparing raw API payload token count vs compact output
- CI check to block regressions >10% in token footprint

---

## 10) Phasing and Roadmap

### Phase 0: Validate (Week 0 — before writing code)

**Purpose:** Prove demand exists before investing engineering time. Distribution > features.

**Scope:**
- Write r/mcp launch post as if the product exists (positioning test)
- Write the README as the "sell" page — what it does, why it matters, how it's different
- Build a 60-second concept video (Remotion-based, demo-able prototype)
- Post to r/mcp, r/ClaudeAI, r/LocalLLaMA — gauge reactions
- Identify 10 early adopters (DM MCP power users from Reddit threads)

**Exit Criteria:**
- Reddit post gets meaningful engagement (≥20 upvotes, ≥5 substantive comments)
- At least 3 "where can I install this?" or "when is this shipping?" signals
- Zero or negative signal → re-evaluate scope/positioning before building

**Go/No-Go:** If Phase 0 validates, proceed to MVP. If not, pivot positioning and test again before committing engineering effort.

---

### Phase MVP (Weeks 1–3) — The Demo-able Version

**Purpose:** Ship the minimum feature set that delivers the core magic: zero-config transcript retrieval + playlist-level semantic search. This is what the 60-second demo shows.

**Scope (4 tools):**
- `readTranscript` — zero-config via yt-dlp, long-video aware (auto-downgrade, pagination, chapter mode)
- `importPlaylist` — ingest playlist, fetch transcripts, chunk, embed, index locally
- `searchTranscripts` — semantic search across indexed transcripts with timestamp deep links
- `inspectVideo` — basic video metadata and stats

**Infrastructure:**
- Full fallback chain (yt-dlp → page extraction → graceful error; API v3 when key present)
- SQLite cache + sqlite-vec vector store (zero-config, single DB file)
- Local embedding model (@xenova/transformers, all-MiniLM-L6-v2, ~80MB, no API key)
- Provenance on every response
- `npx youtube-mcp` just works — zero config required

**Exit Criteria:**
- All 4 tools implemented + tests
- Fallback chain verified with and without API key
- Playlist import: successfully ingest 50-video playlist end-to-end
- Semantic search: relevant results across indexed videos with ≥0.7 precision@10
- Vector store: persistence verified across server restarts
- End-to-end demo: import Stanford CS playlist → search "backpropagation" → timestamped results
- npm publish: `npx youtube-mcp` installs and runs first try

**Launch (end of Week 3):**
- Publish to npm
- Post to r/mcp with real demo (not concept — working product)
- Submit to MCP directories (Smithery, Glama, PulseMCP)
- Update README with actual usage examples

---

### Phase V1 (Weeks 4–6) — Full Feature Set (only if MVP validates)

**Go/No-Go criteria (must pass ALL):**
- ≥50 GitHub stars on MVP
- ≥100 npm downloads/week
- ≥3 GitHub issues requesting features
- Rajan still has energy and conviction

**Scope (adds ~12 tools on top of MVP):**
- **Core retrieval:** `findVideos`, `inspectChannel`, `listChannelCatalog`, `readComments`, `measureAudienceSentiment`, `watchTopicTrends`
- **Batch + Playlist:** `expandPlaylist`, `analyzePlaylist`, `analyzeVideoSet`, `importVideos`
- **Management:** `listCollections`, `removeCollection`
- **Opt-in:** `downloadVideo` (behind `YOUTUBE_MCP_ENABLE_DOWNLOAD=true`)
- Compact output system (token optimization targeting 75-87% savings)
- Full test coverage (≥90%)

**Exit Criteria:**
- All V1 tools implemented + tests
- Sentiment output quality baseline validated
- Token optimization verified via benchmark harness
- Download tool tested across quality/format options

---

### Phase V2 (Weeks 7–10) — Creator Intelligence (only if V1 validates)

**Go/No-Go:** ≥100 stars, ≥200 downloads/week, ≥5 feature requests for creator tools

**Scope:**
- `findContentGaps`, `scoreHookPatterns`, `recommendUploadWindows`, `compareShortsVsLong`, `researchTagsAndTitles`
- Creator insights and recommendation quality tuning

**Exit Criteria:**
- Creator reports generated end-to-end for 20 sample channels
- Hook and gap scoring calibration completed

---

### Phase V3 (Weeks 11–14) — Competitor + Brand Intelligence (only if V2 validates)

**Go/No-Go:** ≥250 stars, clear demand signal from issues/discussions

**Scope:**
- `benchmarkChannels`, `measureShareOfVoice`, `mapGrowthTrajectory`, `detectSponsoredContent`, `findAudienceOverlap`, `assessMonetizationReadiness`
- Competitive + brand intelligence layer

**Exit Criteria:**
- Benchmark output stability across 3 niches
- Share-of-voice and trajectory metrics validated for consistency

---

## 11) Distribution Strategy

### Packaging

- Publish as `youtube-mcp-intel` (working name) on npm
- Provide:
  - `npx -y youtube-mcp-intel` quick start
  - Docker image for SSE deployment
  - example configs for Claude Desktop, Cursor, VS Code MCP

### Adoption Path

1. **Zero-config mode first** (no key required)
2. **API-enhanced mode second** (add key for higher fidelity and quota-dependent features)
3. **Team mode** (SSE + cache backing store)

### Developer Experience

- one-page quick start
- persona-based recipe docs (Creator / Researcher / Brand Builder)
- output examples with compact vs verbose comparison

---

## 12) Success Metrics

### Product Metrics

- **Activation:** ≥70% of new installs run at least one successful tool call in first session
- **Zero-config success:** ≥60% of first sessions succeed without API key
- **Fallback resilience:** ≥95% call success rate overall
- **Token efficiency:** median ≥75% reduction vs raw API baseline
- **Insight usage:** ≥40% of sessions invoke analysis tools (not just retrieval)

### Engineering Metrics

- p95 latency:
  - metadata/search tools: <2.5s
  - transcript/comment tools: <6s
  - analysis tools: <8s
- test coverage target: ≥90%
- unhandled errors: <0.5%

### Business/Adoption Metrics

- npm weekly downloads growth
- GitHub stars/contributions velocity
- repeat usage cohort retention (week 2 and week 4)

---

## 13) Risks and Mitigations

### Risk 1: Upstream platform changes break extraction

**Mitigation:**
- adapter isolation per source tier
- fixture-based contract tests
- rapid parser hotfix workflow

### Risk 2: API quota exhaustion in heavy usage

**Mitigation:**
- proactive cache + quota-aware scheduler
- automatic fallback to tier 2/3
- quota usage telemetry and warnings

### Risk 3: Sentiment/analysis quality variance by niche/language

**Mitigation:**
- confidence scoring + explicit caveats
- language-aware preprocessing
- iterative calibration set per vertical

### Risk 4: Token optimization hides useful detail

**Mitigation:**
- `compact` and `includeRaw` toggles
- field projection (`fields[]`) and verbose mode

### Risk 5: Embedding model size and first-run latency

**Mitigation:**
- `all-MiniLM-L6-v2` is only ~80MB - downloaded once on first use
- Progress feedback during model download
- Pre-built Docker images with model baked in
- Optional external embedding API for users who prefer not to download

### Risk 6: Large playlist import overwhelms resources

**Mitigation:**
- Configurable `maxVideos` cap (default 50)
- Sequential processing with progress reporting via MCP notifications
- Resumable imports (skip already-indexed videos by default)
- Chunked embedding generation to manage memory

### Risk 7: Overly broad scope across personas

**Mitigation:**
- strict phase gates
- V1 reliability first, V2/V3 insights second
- shipping increments with measurable exit criteria

---

## 14) Implementation Readiness Checklist

- [ ] Tool contracts finalized in Zod + TypeScript types
- [ ] Source adapters implemented with contract tests
- [ ] Fallback orchestrator with deterministic retry logic
- [ ] Compact serializer + token benchmark harness
- [ ] SQLite cache store with TTL management
- [ ] sqlite-vec vector store integration
- [ ] Local embedding pipeline (Xenova/transformers)
- [ ] Transcript chunker with time-windowed overlap
- [ ] Collection manager (create, list, remove)
- [ ] Playlist import pipeline (fetch → transcript → chunk → embed → store)
- [ ] Semantic search with ranked results + timestamp deep links
- [ ] CI pipeline: lint, unit, integration, token regression checks
- [ ] npm publish pipeline + versioning policy
- [ ] Quick-start docs and persona recipes

---

## 15) Final Product Positioning

I am positioning this product as:

> **"The reliable, zero-config YouTube intelligence server for MCP workflows - with built-in semantic search."**

The core value is not raw retrieval - it is dependable, compact, decision-ready intelligence that works even when ideal credentials are not available. The playlist import + semantic search workflow transforms YouTube from a passive video platform into a queryable knowledge base, all running locally with no API keys required.

---
---

# V2 Extension — Lessons from Live Claude Desktop Testing

**Added:** 2026-03-14
**Status:** Implementation-ready specification
**Context:** Real-world testing in Claude Desktop exposed eight categories of product gaps beyond the original feature catalog. This extension turns those gaps into concrete tool contracts, behavior rules, and defaults.

**What is V2 vs Later:**
- Everything in this section is **V2 scope** — implementable tonight by a coding agent.
- V3 tools (benchmarkChannels, measureShareOfVoice, etc.) remain deferred per original roadmap.

---

## V2.1) Collection Scoping as a First-Class Concept

### Problem Observed
In live testing, Claude consistently had to guess or ask which collection to search. With multiple imported playlists, `searchTranscripts` without a `collectionId` searches everything — sometimes useful, often noisy. The LLM has no way to "focus" on a specific knowledge domain without memorizing collection IDs.

### Product Behavior

**Active Collection:** The server maintains an optional session-level "active collection" that automatically scopes KB tools when no explicit `collectionId` is provided.

**Rules:**
1. When `activeCollectionId` is set, `searchTranscripts`, `importVideos`, and `listCollections` default to it.
2. When `collectionId` is explicitly passed, it overrides the active collection for that call only.
3. When no active collection is set and no `collectionId` is passed, behavior is unchanged (search all / create new).
4. Setting active collection to `null` clears it (returns to "search all" default).
5. Active collection state persists for the lifetime of the MCP server process (not across restarts).

### New Tool: `setActiveCollection`

```ts
export interface SetActiveCollectionInput {
  collectionId: string | null; // null to clear
}

export interface SetActiveCollectionOutput {
  activeCollectionId: string | null;
  collectionLabel?: string;
  videoCount?: number;
  totalChunks?: number;
  message: string; // human-readable confirmation for the LLM
}
```

**Tool description:** `"Set the active collection for all subsequent knowledge base operations. Pass null to clear. When active, searchTranscripts and importVideos default to this collection without needing collectionId on every call."`

### New Tool: `getActiveCollection`

```ts
export interface GetActiveCollectionOutput {
  activeCollectionId: string | null;
  collectionLabel?: string;
  videoCount?: number;
  totalChunks?: number;
  embeddingProvider?: string;
  embeddingModel?: string;
}
```

**Tool description:** `"Check which collection is currently active for knowledge base operations. Returns null if no collection is scoped."`

### Affected Existing Tools

- `searchTranscripts`: If `collectionId` is omitted and active collection is set, use active collection. Response includes `scopedBy: "active_collection" | "explicit" | "all"` field.
- `importVideos`: If `collectionId` is omitted and active collection is set, import into active collection.
- `importPlaylist`: Unaffected — always creates/uses playlist-derived collection ID unless explicitly overridden.

---

## V2.2) Transcript Availability + Preflight Diagnostics

### Problem Observed
When Claude tries to import a playlist, some videos silently fail because transcripts are unavailable (live streams, music videos, explicit no-caption content). The LLM has no way to check before committing to a batch import. This leads to confusing partial failures.

### New Tool: `preflightTranscript`

Pre-check transcript availability for one or more videos without fetching full content. Fast, cheap, no embedding work.

```ts
export interface PreflightTranscriptInput {
  videoIdsOrUrls: string[]; // 1..50
  language?: string; // preferred language
}

export interface PreflightTranscriptOutput {
  results: Array<{
    videoId: string;
    title?: string;
    transcriptAvailable: boolean;
    availableLanguages?: string[];
    sourceType?: "manual_caption" | "auto_caption" | "unknown";
    estimatedCharacters?: number; // rough size hint
    estimatedTokens?: number;
    qualityHint?: "high" | "medium" | "low" | "unknown"; // based on source type + language match
    reason?: string; // why unavailable, e.g. "live stream", "no captions", "private video"
  }>;
  summary: {
    total: number;
    available: number;
    unavailable: number;
    availablePct: number;
  };
  provenance: Provenance;
}
```

**Tool description:** `"Pre-check transcript availability for videos before importing. Returns availability, languages, quality hints, and size estimates. Use before importPlaylist/importVideos to avoid surprise failures."`

### Quality Hint Rules
- `"high"`: manual captions in requested language
- `"medium"`: auto-captions in requested language, or manual captions in different language
- `"low"`: auto-captions in different language only
- `"unknown"`: could not determine source type

---

## V2.3) Sparse / Low-Quality Transcript Fallback Rules

### Problem Observed
Some videos have auto-generated transcripts that are borderline useless — garbled text, music lyrics repeated, or extremely sparse (e.g., a 30-minute video with 200 characters of transcript). These get indexed and pollute search results.

### Product Behavior

**Minimum quality gate on import:**
1. If transcript text is < 200 characters for a video > 60 seconds, mark as `quality: "insufficient"` and skip indexing by default.
2. If transcript `sourceType` is `"auto_caption"` and average word confidence (when available) is < 0.4, mark as `quality: "low"` and emit a warning in import output.
3. New optional parameter on import tools: `minTranscriptQuality?: "any" | "low" | "medium" | "high"` (default `"low"`).
   - `"any"`: import everything, even garbled text.
   - `"low"`: skip only truly insufficient transcripts (< 200 chars for > 60s video).
   - `"medium"`: require auto-caption or better.
   - `"high"`: require manual captions only.

### Import Output Extension

Add to `ImportPlaylistOutput` and `ImportVideosOutput`:

```ts
qualityReport?: {
  skippedLowQuality: number;
  skippedNoTranscript: number;
  warnings: Array<{
    videoId: string;
    reason: string; // "transcript too sparse (142 chars for 1800s video)", "auto-caption confidence 0.31"
  }>;
};
```

---

## V2.4) Unified Video Dossier Workflow

### Problem Observed
In testing, Claude frequently needed to "fully understand" a single video — metadata, transcript, comments, sentiment, and provenance — but had to make 3-4 separate tool calls. This is slow, token-heavy (repeated provenance/metadata), and error-prone (partial failures across calls).

### New Tool: `buildVideoDossier`

One-call deep analysis of a single video. Returns a unified, compact dossier that combines everything the LLM needs to reason about a video.

```ts
export interface BuildVideoDossierInput extends TokenControls {
  videoIdOrUrl: string;
  includeSections?: Array<
    "metadata" | "transcript" | "comments" | "sentiment" | "hooks"
  >; // default all
  transcriptMode?: "summary" | "key_moments" | "chapters" | "full"; // default "key_moments"
  commentsSampleSize?: number; // default 100
  language?: string;
}

export interface BuildVideoDossierOutput {
  videoId: string;
  title: string;
  channelTitle: string;
  url: string;

  metadata?: {
    publishedAt?: string;
    durationSec?: number;
    category?: string;
    tags?: string[];
    language?: string;
    views?: number;
    likes?: number;
    comments?: number;
    likeRate?: number;
    commentRate?: number;
  };

  transcript?: {
    available: boolean;
    sourceType?: "manual_caption" | "auto_caption" | "generated_from_audio" | "unknown";
    languageUsed?: string;
    mode: string;
    text?: string;
    segments?: TranscriptSegment[];
    chapters?: Chapter[];
    totalCharacters?: number;
    qualityHint?: "high" | "medium" | "low" | "unknown";
  };

  comments?: {
    totalFetched: number;
    threads: ReadCommentsOutput["threads"];
  };

  sentiment?: {
    sampleSize: number;
    positivePct: number;
    neutralPct: number;
    negativePct: number;
    sentimentScore: number;
    themes?: MeasureAudienceSentimentOutput["themes"];
    riskSignals?: MeasureAudienceSentimentOutput["riskSignals"];
    representativeQuotes?: MeasureAudienceSentimentOutput["representativeQuotes"];
  };

  hooks?: {
    hookScore: number;
    hookType: string;
    first30SecSummary: string;
    weakSignals: string[];
    improvements: string[];
  };

  // Single provenance covering the whole dossier
  provenance: Provenance & {
    sectionsAttempted: string[];
    sectionsSucceeded: string[];
    sectionsFailed: Array<{ section: string; error: string }>;
  };
}
```

**Tool description:** `"Build a complete dossier for a single video: metadata, transcript, comments, sentiment, and hook analysis in one call. Specify which sections you need. Partial success is allowed — failed sections are reported, not fatal."`

**Behavior:**
- Sections execute in parallel where possible (metadata + transcript can run concurrently with comments).
- A failed section does not fail the dossier — it's reported in `provenance.sectionsFailed`.
- Single provenance block covers the whole dossier with per-section success/failure tracking.

---

## V2.5) Comment-Aware Knowledge Base

### Problem Observed
Comments contain valuable audience signal — questions, complaints, feature requests, cultural references — but they're not searchable in the KB. The current `readComments` + `measureAudienceSentiment` tools work per-video, but there's no way to search across comment corpora semantically (e.g., "find all comments asking about pricing across my imported videos").

### Product Behavior

**Optional comment indexing during import.** Comments are NOT indexed by default (they're noisy and large). Users opt in explicitly.

### Extended Import Parameters

Add to `importPlaylist` and `importVideos` input schemas:

```ts
indexComments?: boolean; // default false
commentsPerVideo?: number; // default 50, max 200
commentChunkSize?: number; // default 20 comments per chunk
```

When `indexComments: true`:
1. Fetch top comments for each video during import.
2. Group comments into chunks of `commentChunkSize` comments each.
3. Embed and index comment chunks alongside transcript chunks.
4. Comment chunks are tagged with `chunkType: "comment"` to distinguish from transcript chunks.

### Extended Search

Add to `searchTranscripts` input schema:

```ts
chunkTypes?: Array<"transcript" | "comment">; // default ["transcript"] — must opt in to comments
```

Search results include:

```ts
// Added to each result item:
chunkType: "transcript" | "comment"; // so the LLM knows what it's reading
```

### New Tool: `searchComments`

Convenience wrapper that searches only comment chunks. Equivalent to `searchTranscripts` with `chunkTypes: ["comment"]`.

```ts
export interface SearchCommentsInput {
  query: string;
  collectionId?: string; // defaults to active collection if set
  maxResults?: number; // default 10
  minScore?: number; // default 0.3
  videoIdFilter?: string[];
}

export interface SearchCommentsOutput {
  query: string;
  results: Array<{
    collectionId: string;
    videoId: string;
    videoTitle: string;
    channelTitle?: string;
    commentTexts: string[]; // the comments in this chunk
    score: number;
    lexicalScore?: number;
    semanticScore?: number;
  }>;
  searchMeta: {
    totalChunksSearched: number;
    embeddingModel: string;
    searchLatencyMs: number;
  };
  provenance: Provenance;
}
```

**Tool description:** `"Search across indexed comments in the knowledge base. Only available for collections imported with indexComments: true. Find audience questions, complaints, and patterns across videos."`

### Schema Extension

Add to `transcript_chunks` table:

```sql
ALTER TABLE transcript_chunks ADD COLUMN chunk_type TEXT NOT NULL DEFAULT 'transcript';
-- Values: 'transcript' | 'comment'
```

---

## V2.6) Credential Model + Auth/Health Diagnostics

### Problem Observed
In Claude Desktop testing, the most common "why isn't this working?" moment was credential misconfiguration — API key not set, Gemini key expired, yt-dlp not on PATH, data directory permissions. The LLM had no way to diagnose these without trial-and-error tool calls.

### New Tool: `checkHealth`

```ts
export interface CheckHealthOutput {
  server: {
    version: string;
    uptime: number; // seconds
    nodeVersion: string;
    platform: string;
  };

  credentials: {
    youtubeApiKey: {
      configured: boolean;
      valid?: boolean; // null if not tested yet
      quotaRemaining?: number; // if testable
    };
    geminiApiKey: {
      configured: boolean;
      valid?: boolean;
    };
  };

  runtime: {
    ytDlpAvailable: boolean;
    ytDlpVersion?: string;
    ytDlpPath?: string;
    dataDir: string;
    dataDirWritable: boolean;
    knowledgeBaseExists: boolean;
    knowledgeBaseSizeBytes?: number;
  };

  activeCollection?: {
    collectionId: string;
    label?: string;
    videoCount: number;
    totalChunks: number;
  };

  capabilities: {
    canSearch: boolean; // yt-dlp or API key present
    canFetchComments: boolean; // API key present (comments need API)
    canEmbed: boolean; // local always true; gemini needs key
    canImport: boolean; // yt-dlp available
    embeddingProvider: string; // "local" | "gemini"
  };

  issues: Array<{
    severity: "error" | "warning" | "info";
    component: string;
    message: string;
    suggestion: string;
  }>;
}
```

**Tool description:** `"Check server health, credential status, runtime dependencies, and capabilities. Use this first when things aren't working, or to understand what features are available."`

**Behavior:**
- No input required — zero-arg tool.
- Fast — should return in < 500ms. Does NOT make upstream API calls to validate keys by default.
- `issues[]` proactively surfaces problems: "yt-dlp not found on PATH — transcript fallback and imports will fail", "GEMINI_API_KEY not set — using local embeddings (lower quality)", etc.

### Credential Validation Rules

| Credential | How to check | When to check |
|---|---|---|
| `YOUTUBE_API_KEY` | Env var presence | On server start, on `checkHealth` |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Env var presence | On server start, on `checkHealth` |
| `yt-dlp` | `which yt-dlp` / `where yt-dlp` | On server start, on `checkHealth` |
| Data dir | `fs.accessSync(dir, W_OK)` | On server start, on `checkHealth` |

---

## V2.7) Client-Runtime Ergonomics

### Problem Observed
Claude Desktop (and similar MCP clients) has specific behaviors that affect the user experience:
1. `npx` resolution can fail if the user's PATH doesn't include npm/node.
2. The data directory default (`~/Library/Application Support/youtube-mcp/`) is macOS-specific.
3. First-run local embedding model download (~80MB) blocks with no progress feedback in MCP stdio mode.
4. Error messages from the server are often too technical for the LLM to actionably present to the user.

### Product Behavior

**1. Cross-platform data directory defaults:**

```ts
function defaultDataDir(): string {
  if (process.env.YOUTUBE_MCP_DATA_DIR) return process.env.YOUTUBE_MCP_DATA_DIR;

  switch (process.platform) {
    case "darwin":
      return join(homedir(), "Library", "Application Support", "youtube-mcp");
    case "win32":
      return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "youtube-mcp");
    default: // linux, etc.
      return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "youtube-mcp");
  }
}
```

**2. Startup diagnostics on stderr:**

On server start, emit a brief diagnostic block to stderr (not stdout, which is MCP transport):

```
youtube-mcp v0.3.0 starting
  data dir: /Users/rajan/Library/Application Support/youtube-mcp
  yt-dlp: /opt/homebrew/bin/yt-dlp (2025.01.15)
  youtube api: configured
  embeddings: gemini (gemini-embedding-2-preview, 768d)
  knowledge base: 3 collections, 847 chunks
```

**3. LLM-friendly error messages:**

Every `GracefulError` must include a `userFriendlyMessage` field — a plain-English sentence the LLM can relay directly to the user without reformulation:

```ts
export interface GracefulError {
  code: string;
  message: string; // technical
  userFriendlyMessage: string; // "I couldn't find captions for this video. It might be a live stream or music video without subtitles."
  retryable: boolean;
  attemptedTiers: SourceTier[];
  suggestion?: string;
}
```

**4. Collection context in tool responses:**

When an active collection is set, include it in relevant tool responses so the LLM always knows where it's working:

```ts
// Added to searchTranscripts, importVideos responses:
context?: {
  activeCollectionId?: string;
  activeCollectionLabel?: string;
  scopedBy: "active_collection" | "explicit" | "all";
};
```

---

## V2.8) Implementation Readiness Checklist (V2 Extension)

- [ ] `setActiveCollection` + `getActiveCollection` tools
- [ ] Active collection scoping in `searchTranscripts` and `importVideos`
- [ ] `preflightTranscript` tool
- [ ] Transcript quality gate on import (min chars, source type check)
- [ ] `qualityReport` in import outputs
- [ ] `buildVideoDossier` tool with parallel section execution
- [ ] `indexComments` parameter on import tools
- [ ] Comment chunk storage (`chunk_type` column migration)
- [ ] `chunkTypes` filter on `searchTranscripts`
- [ ] `searchComments` convenience tool
- [ ] `checkHealth` tool
- [ ] Cross-platform `defaultDataDir`
- [ ] Startup diagnostics on stderr
- [ ] `userFriendlyMessage` on all `GracefulError` instances
- [ ] `context` block in KB tool responses
- [ ] Schema migration for `chunk_type` column (backward-compatible ALTER TABLE)

---

## V2.9) Schema Migration Strategy

The V2 extension requires one schema change to the `transcript_chunks` table:

```sql
-- Migration 001: Add chunk_type column
ALTER TABLE transcript_chunks ADD COLUMN chunk_type TEXT NOT NULL DEFAULT 'transcript';
```

**Migration rules:**
1. Run on knowledge base open (in `TranscriptKnowledgeBase` constructor).
2. Use `PRAGMA user_version` to track migration state.
3. If column already exists, skip silently.
4. Default value `'transcript'` ensures backward compatibility — existing chunks are correctly typed.

---

## V2.10) Updated Tool Catalog Summary

After V2, the full tool surface is:

| Tool | Category | V1/V2 | Status |
|---|---|---|---|
| `findVideos` | Core retrieval | V1 | Shipped |
| `inspectVideo` | Core retrieval | V1 | Shipped |
| `inspectChannel` | Core retrieval | V1 | Shipped |
| `listChannelCatalog` | Core retrieval | V1 | Shipped |
| `readTranscript` | Core retrieval | V1 | Shipped |
| `readComments` | Core retrieval | V1 | Shipped |
| `measureAudienceSentiment` | Analysis | V1 | Shipped |
| `analyzeVideoSet` | Batch | V1 | Shipped |
| `expandPlaylist` | Batch | V1 | Shipped |
| `analyzePlaylist` | Batch | V1 | Shipped |
| `importPlaylist` | Knowledge Base | V1 | Shipped (extend for V2) |
| `importVideos` | Knowledge Base | V1 | Shipped (extend for V2) |
| `searchTranscripts` | Knowledge Base | V1 | Shipped (extend for V2) |
| `listCollections` | Knowledge Base | V1 | Shipped |
| `removeCollection` | Knowledge Base | V1 | Shipped |
| `scoreHookPatterns` | Creator Intel | V1.5 | Shipped |
| `researchTagsAndTitles` | Creator Intel | V1.5 | Shipped |
| `compareShortsVsLong` | Creator Intel | V1.5 | Shipped |
| `recommendUploadWindows` | Creator Intel | V1.5 | Shipped |
| **`setActiveCollection`** | **Session** | **V2** | **New** |
| **`getActiveCollection`** | **Session** | **V2** | **New** |
| **`preflightTranscript`** | **Diagnostics** | **V2** | **New** |
| **`buildVideoDossier`** | **Analysis** | **V2** | **New** |
| **`searchComments`** | **Knowledge Base** | **V2** | **New** |
| **`checkHealth`** | **Diagnostics** | **V2** | **New** |
| `watchTopicTrends` | **Discovery / Trends** | V1 | Shipped (repositioned from Core) |
| **`analyzeNicheTrends`** | **Discovery / Trends** | **V2.5** | **New — hero tool** |
| **`compareNiches`** | **Discovery / Trends** | **V2.5** | **New** |
| **`trackNicheOverTime`** | **Discovery / Trends** | **V2.5** | **New** |

**Total: 28 tools** (19 shipped + 6 V2 new + 3 Discovery/Trends new)

---

## V2.11) Risks and Mitigations (V2 Specific)

### Risk: Comment indexing bloats knowledge base
**Mitigation:** Off by default. `commentsPerVideo` capped at 200. Comment chunks clearly tagged for separate filtering. `removeCollection` wipes everything including comments.

### Risk: Active collection state causes confusion if LLM forgets context
**Mitigation:** Every KB response includes `context.activeCollectionId`. `checkHealth` surfaces it. `getActiveCollection` is a zero-cost check. Active collection is process-scoped — server restart clears it.

### Risk: Schema migration breaks existing databases
**Mitigation:** `ALTER TABLE ADD COLUMN` with `DEFAULT` is non-destructive in SQLite. Migration gated behind `PRAGMA user_version`. Tested against empty DB and populated DB.

### Risk: `buildVideoDossier` is slow for long videos
**Mitigation:** Default transcript mode is `key_moments` (not `full`). Sections run in parallel. Individual section timeout of 30s. LLM can select which sections it needs via `includeSections`.

### Risk: `checkHealth` leaks sensitive info
**Mitigation:** Never returns API key values — only `configured: true/false`. Path information is limited to data dir and yt-dlp location (both already visible to the process). No network calls by default.

---

## V2.12) Modular Product Architecture

### Design Philosophy

YouTube MCP is a **platform with modules**, not a monolith. Each module is a coherent feature surface that can be enabled independently. The base/core module is always present. Extension modules register additional tools, may require additional credentials or dependencies, and declare their own capability requirements.

This architecture serves three goals:
1. **Keep the default tool surface lean.** A user who just wants transcripts shouldn't see 30 tools.
2. **Enable progressive capability.** Users add modules as their needs grow.
3. **Isolate dependencies.** Frame-level search needs ffmpeg + a vision model. Comment sentiment needs an LLM. Neither should block the core from working.

### Module Map

| Module | Scope | Default? | Dependencies Beyond Core | Status |
|---|---|---|---|---|
| **Core** | Video/channel/playlist retrieval, transcripts, fallback chain, provenance | Always on | `yt-dlp` (optional but strongly recommended) | **Shipped** |
| **Knowledge Base** | Transcript import, semantic search, collections, active collection | Always on | Embedding provider (local built-in or Gemini) | **Shipped** |
| **Sentiment** | Comment sentiment analysis, themes, risk signals, representative quotes | Always on | None (heuristic-based) | **Shipped** |
| **Creator Intel** | Hook scoring, tag/title research, Shorts vs long-form, upload windows | Always on | None | **Shipped** |
| **Batch** | Multi-video analysis, playlist analysis, video set analysis | Always on | None | **Shipped** |
| **Diagnostics** | Health check, preflight transcript, active collection management | Always on | None | **V2 — build tonight** |
| **Dossier** | Unified single-video deep analysis | Always on | None | **V2 — build tonight** |
| **Comment KB** | Comment indexing + semantic search across comment corpora | Always on | None | **V2.17 — Shipped** |
| **Media / Assets** | Video/audio download, asset management, keyframe extraction | Always on | `yt-dlp`, `ffmpeg` (for keyframes) | **V2.17 — Shipped** |
| **Discovery / Trends** | Niche trend analysis, momentum, saturation, competitor landscape, content gaps | Always on | None (better with YouTube API key) | **V2.17 — Shipped** |
| **Visual Search** | Frame-level indexing, scene search, visual Q&A over video content | **Opt-in** (future) | `ffmpeg`, vision model (Gemini), large storage | **V3 — design now, build later** |
| **Competitive Intel** | Channel benchmarking, share of voice, growth trajectory, sponsorship detection | **Opt-in** (future) | YouTube API key (required, not optional) | **V3 — per original roadmap** |

### Module Registration Model

**V2 implementation (tonight):** Modules are not yet runtime-pluggable. The architecture is expressed through:
1. **Tool grouping** — tools are logically grouped by module in the codebase (`src/modules/core/`, `src/modules/kb/`, etc. or equivalent flat structure with clear naming).
2. **Capability gating** — opt-in tools only register when their config flag is set (already done for `downloadVideo`).
3. **`checkHealth` output** — lists which modules are active and their capability status.

**Future (post-V3):** True plugin architecture where modules are separate npm packages that register tools at startup.

### Module Detail: Core

**Always present. Zero-config.**

Tools: `findVideos`, `inspectVideo`, `inspectChannel`, `listChannelCatalog`, `readTranscript`, `readComments`, `expandPlaylist`

This module handles all data retrieval with the fallback chain. It is the foundation everything else builds on.

### Module Detail: Knowledge Base

**Always present. The main differentiator.**

Tools: `importPlaylist`, `importVideos`, `searchTranscripts`, `listCollections`, `removeCollection`, `setActiveCollection`, `getActiveCollection`

Operates on **transcript text**. Embeddings are generated from transcript chunk text. Search is semantic over words/concepts, not over visual content.

**What transcript-level search can do:**
- Find mentions of a topic across hours of video ("where does he discuss gradient descent?")
- Locate specific explanations, arguments, or instructions
- Cross-reference concepts across multiple creators or lecture series

**What transcript-level search cannot do:**
- Identify what's shown on screen (diagrams, code, slides, faces)
- Find visual moments ("the part where he draws the architecture diagram")
- Answer questions about visual content not verbalized in speech

This distinction matters. The Knowledge Base module is powerful for spoken content. For visual content, see the Visual Search module below.

### Module Detail: Comment KB (Opt-in Extension)

**Enabled per-import with `indexComments: true`.**

Tools: `searchComments` (new)
Extended tools: `searchTranscripts` gains `chunkTypes` filter

Comments are indexed as text chunks alongside transcripts. They use the same embedding pipeline and collection structure. The `chunkType` field distinguishes them.

### Module Detail: Download (Opt-in Extension)

**Enabled via `YOUTUBE_MCP_ENABLE_DOWNLOAD=true`.**

Tools: `downloadVideo` (already spec'd in V1 PRD)

Downloads video/audio files via `yt-dlp`. Files are stored locally at a configurable path.

**V2 scope extension — Asset Management:**

When download is enabled, downloaded files should be trackable:

```ts
export interface DownloadVideoOutput {
  videoId: string;
  title: string;
  filePath: string; // absolute path to downloaded file
  fileSize: number;
  format: string;
  quality: string;
  durationSec?: number;
  provenance: Provenance;
}
```

Add a new tool for managing downloaded assets:

#### Tool: `listDownloads`

```ts
export interface ListDownloadsInput {
  collectionId?: string; // filter by collection
  format?: string; // filter by format
}

export interface ListDownloadsOutput {
  downloads: Array<{
    videoId: string;
    title: string;
    filePath: string;
    fileSize: number;
    format: string;
    downloadedAt: string;
    collectionId?: string;
  }>;
  totalSizeBytes: number;
  provenance: Provenance;
}
```

This enables workflows like: "download all videos in this playlist, then later process them for frame extraction."

**Schema extension:**
```sql
CREATE TABLE IF NOT EXISTS downloaded_assets (
  video_id TEXT NOT NULL,
  collection_id TEXT,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  format TEXT NOT NULL,
  quality TEXT,
  downloaded_at TEXT NOT NULL,
  PRIMARY KEY (video_id, format)
);
```

### Module Detail: Visual Search (Future — V3+)

**This is the big one. Distinct from transcript search. Requires significant additional infrastructure.**

#### What Visual Search Actually Requires

Transcript-level semantic search works because transcripts are text — embed text, search text. Visual search over video content is a fundamentally different problem. Here is what's required, honestly:

**1. Frame Extraction Pipeline**
- Dependency: `ffmpeg` (already common, but not trivial)
- Extract keyframes at configurable intervals (e.g., every 5s, or scene-change detection)
- For a 1-hour video at 1 frame/5s: 720 frames → ~50-150MB of images
- Storage: frames stored locally alongside knowledge base or in a configurable media directory

**2. Scene Segmentation**
- Group consecutive similar frames into "scenes"
- Each scene = a time range with representative frames
- Reduces 720 frames to ~30-80 meaningful scenes
- Can be done with pixel-hash similarity (fast, local) or model-based (slower, better)

**3. Visual Description Generation**
- Each scene's representative frame(s) need a text description
- Options:
  - **Gemini Vision** (`gemini-2.0-flash` or similar) — best quality, requires API key, ~$0.001/image
  - **Local vision model** (LLaVA, etc.) — free, slower, lower quality
  - **OCR** (Tesseract) — extracts on-screen text (slides, code, captions burned into video)
- Output: per-scene text description ("Slide showing a neural network architecture diagram with 3 hidden layers. Title reads 'Backpropagation Overview'.")

**4. Multimodal Embedding**
- Embed the visual descriptions (and optionally raw frame embeddings) alongside transcript chunks
- Each scene becomes a searchable chunk with:
  - Visual description text
  - OCR-extracted text (if any)
  - Corresponding transcript text from that time range
  - Frame thumbnail reference
  - Time range

**5. Unified Search**
- Query searches across both transcript chunks AND visual description chunks
- Results include frame thumbnails and timestamp deep links
- The LLM can distinguish "he said X" from "the slide showed X"

#### Visual Search — Honest Cost Analysis

| Component | Per 1-hour video | Dependency |
|---|---|---|
| Frame extraction | ~5-30s (ffmpeg) | ffmpeg |
| Scene segmentation | ~2-5s (local hash) | None |
| Visual descriptions | ~30-120s, ~$0.05-0.15 | Gemini Vision API |
| OCR | ~10-30s (local) | Tesseract (optional) |
| Embedding | ~2-5s | Same as transcript embedding |
| Storage | ~50-200MB frames + ~1MB descriptions | Disk |

**Total per hour of video:** ~1-3 minutes processing, ~$0.05-0.15 API cost, ~50-200MB storage.

This is feasible but not cheap at scale. A 50-video playlist = ~$2.50-7.50 in API costs + several GB of frame storage.

#### Visual Search — Proposed Tool Surface (V3)

```ts
// Import with visual indexing
export interface ImportVisualInput {
  videoIdsOrUrls: string[];
  collectionId?: string;
  frameIntervalSec?: number; // default 5
  sceneDetection?: boolean; // default true (group similar frames)
  includeOcr?: boolean; // default true
  visionModel?: string; // default "gemini-2.0-flash"
  storeFrames?: boolean; // default true — save extracted frames to disk
}

// Search that spans transcript + visual
export interface SearchVisualInput {
  query: string;
  collectionId?: string;
  searchTypes?: Array<"transcript" | "visual" | "ocr">; // default all
  maxResults?: number;
}

// Result includes visual context
export interface VisualSearchResult {
  videoId: string;
  videoTitle: string;
  chunkType: "transcript" | "visual_scene" | "ocr_text";
  text: string; // transcript text OR visual description OR OCR text
  tStartSec: number;
  tEndSec: number;
  timestampUrl: string;
  score: number;
  framePath?: string; // local path to representative frame (if storeFrames=true)
}
```

#### Visual Search — What We Build Tonight (V2)

**Nothing.** Visual search is a V3 feature. But tonight's V2 build should:
1. Keep `chunk_type` extensible — the column supports future values beyond `"transcript"` and `"comment"` (e.g., `"visual_scene"`, `"ocr_text"`).
2. Keep the embedding pipeline provider-agnostic — Gemini embeddings already work, and visual descriptions will use the same embedding path.
3. Keep the download module's asset tracking in place — frame extraction will use downloaded video files as source material.

The architecture tonight should not block Visual Search later. That's the design constraint.

---

## V2.13) Module Capability Matrix

This matrix shows what each module needs and what it provides, so a coding agent (or user) can reason about trade-offs:

| Module | Needs API Key? | Needs yt-dlp? | Needs ffmpeg? | Needs Vision Model? | Disk Impact | Token Cost |
|---|---|---|---|---|---|---|
| Core | Optional (better with) | Recommended | No | No | ~1MB (cache) | Low |
| Knowledge Base | No (local embed) or Gemini key | Yes (for transcripts) | No | No | ~5-50MB per collection | Low |
| Sentiment | No | No (uses comments from Core) | No | No | None | Low |
| Creator Intel | No | No (uses data from Core) | No | No | None | Low |
| Batch | Same as Core | Same as Core | No | No | None | Medium |
| Diagnostics | No | No | No | No | None | Minimal |
| Dossier | Same as Core | Same as Core | No | No | None | Medium |
| Comment KB | No | No (uses comments from Core) | No | No | ~1-10MB per collection | Low |
| Download | No | **Yes (required)** | No | No | **Large** (video files) | None |
| Discovery / Trends | Optional (better demand signals with) | Recommended | No | No | ~1MB (snapshots) | Medium-High |
| Visual Search | **Gemini key** | Yes | **Yes (required)** | **Yes (required)** | **Very large** | High |
| Competitive Intel | **Yes (required)** | No | No | No | ~1MB (cache) | Medium |

### `checkHealth` Module Awareness

The `checkHealth` tool (V2.6) should report module status:

```ts
// Extended checkHealth output
modules: {
  core: { enabled: true, healthy: boolean };
  knowledgeBase: { enabled: true, healthy: boolean, embeddingProvider: string };
  sentiment: { enabled: true };
  creatorIntel: { enabled: true };
  batch: { enabled: true };
  diagnostics: { enabled: true };
  dossier: { enabled: true };
  commentKb: { enabled: true }; // always available, activated per-import
  download: { enabled: boolean, reason?: string }; // gated by env var
  visualSearch: { enabled: false, reason: "V3 — not yet implemented" };
  competitiveIntel: { enabled: false, reason: "V3 — not yet implemented" };
};
```

---

## V2.14) Updated Implementation Readiness Checklist (Modular Architecture)

In addition to V2.8 checklist items:

- [ ] `checkHealth` includes `modules` status block
- [ ] `chunk_type` column values documented as extensible (`transcript`, `comment`, and future: `visual_scene`, `ocr_text`)
- [ ] Download module: `listDownloads` tool + `downloaded_assets` table schema
- [ ] Download module: asset tracking in `downloadVideo` output (persist to `downloaded_assets`)
- [ ] Startup stderr diagnostics include module status summary
- [ ] README update: module table showing what's available and what each needs

---

## V2.15) Packaging, Installation & User Onboarding Architecture

**Added:** 2026-03-14
**Context:** Product direction requires explicit packaging/install design. The server must be installable by end users who are NOT developers — they want `npx youtube-mcp` to work, or a setup wizard that configures their MCP client automatically.

### Packaging Goals

1. **Zero-config first run.** `npx youtube-mcp` starts the server and serves tools. No API key needed for core functionality (transcripts, search, metadata via yt-dlp).
2. **One-command install.** `npm install -g youtube-mcp` or `npx youtube-mcp` — no cloning repos, no manual build step.
3. **Client auto-detection.** The server (or a setup subcommand) detects which MCP clients are installed and offers to configure them.
4. **Key transparency.** Users understand exactly what each API key unlocks and what works without it.
5. **Diagnostics on demand.** `youtube-mcp doctor` validates the full stack (node version, yt-dlp, API keys, data dir, client config).

### Supported Client Detection Concept

The `youtube-mcp setup` command (or interactive first-run wizard) should detect the presence of known MCP clients and offer to write their config files.

| Client | Config Location | Detection Method | Config Format |
|---|---|---|---|
| **Claude Desktop** | `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS), `%APPDATA%/Claude/claude_desktop_config.json` (Windows) | File existence | JSON — add `mcpServers.youtube-mcp` entry |
| **Claude Code** | Project-level `.mcp.json` or `~/.claude/settings.json` | Check for `claude` CLI on PATH + config file | JSON — `mcpServers` entry |
| **Cursor** | `~/.cursor/mcp.json` | File/directory existence | JSON — `mcpServers` entry |
| **VS Code (Copilot MCP)** | `.vscode/mcp.json` or `settings.json` | `code` CLI on PATH + settings directory | JSON — MCP server entry |
| **ChatGPT Desktop** | Platform-specific MCP config (TBD — evolving) | File existence when standardized | JSON |
| **Codex CLI** | Environment variable / project config | `codex` on PATH | Env-based |
| **Windsurf** | `~/.windsurf/mcp.json` | File/directory existence | JSON — `mcpServers` entry |
| **Custom / Manual** | User-specified | Always available as fallback | Prints config snippet to paste |

**Detection flow:**
1. Scan for known config file paths.
2. Present a list of detected clients with checkboxes (interactive) or auto-configure all (non-interactive `--auto` flag).
3. For each selected client, write (or merge into) the config file.
4. Print a summary of what was configured and what the user needs to do next (e.g., "Restart Claude Desktop to pick up the new server").

**Config entry template (all clients follow a similar pattern):**
```json
{
  "youtube-mcp": {
    "command": "npx",
    "args": ["-y", "youtube-mcp"],
    "env": {
      "YOUTUBE_API_KEY": "${YOUTUBE_API_KEY}",
      "GEMINI_API_KEY": "${GEMINI_API_KEY}"
    }
  }
}
```

### Setup Flow / Onboarding Expectations

**Interactive setup (`youtube-mcp setup`):**

```
$ youtube-mcp setup

🎬 YouTube MCP Server Setup

Checking system requirements...
  ✅ Node.js v22.3.0
  ✅ yt-dlp v2025.01.15 (/opt/homebrew/bin/yt-dlp)
  ⚠️  YOUTUBE_API_KEY not set (optional — core works without it)
  ⚠️  GEMINI_API_KEY not set (optional — local embeddings used instead)

Detected MCP clients:
  ✅ Claude Desktop (~/Library/Application Support/Claude/)
  ✅ Claude Code (~/.claude/)
  ❌ Cursor (not found)
  ❌ VS Code MCP (not found)

Configure Claude Desktop? [Y/n] y
  → Updated claude_desktop_config.json
  → Restart Claude Desktop to activate

Configure Claude Code? [Y/n] y
  → Updated ~/.claude/settings.json

Setup complete! Try asking Claude: "Import this playlist and search for machine learning"
```

**Non-interactive setup (`youtube-mcp setup --auto`):**
- Auto-configures all detected clients without prompting.
- Suitable for CI/automation or users who just want it to work.

**First-run behavior (no setup command):**
- If `youtube-mcp` is invoked directly (e.g., via `npx`), it starts the MCP stdio server immediately — no wizard.
- The setup wizard is opt-in via `youtube-mcp setup`.
- Startup stderr diagnostics (already spec'd in V2.7) provide ambient awareness of configuration state.

### API Key Transparency

Users must understand what each key unlocks. This information appears in:
1. The README (install section)
2. `youtube-mcp setup` output
3. `youtube-mcp doctor` output
4. `checkHealth` tool response (already spec'd in V2.6)

| Key | Env Variable | What It Unlocks | What Works Without It |
|---|---|---|---|
| **YouTube Data API v3** | `YOUTUBE_API_KEY` | Higher rate limits, video statistics (exact view/like counts), comment fetching via API, channel subscriber counts, search via API | Transcripts (yt-dlp), basic metadata (yt-dlp/page extraction), playlist expansion, semantic search, all KB operations |
| **Gemini API** | `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Higher-quality embeddings (768-dim Gemini embedding model), future visual search features | Local embeddings (TF-IDF + LSA hybrid — functional but lower semantic quality), all other features unaffected |
| **yt-dlp** | N/A (binary on PATH) | Transcript fetching, metadata extraction, video download, fallback for API failures | Page extraction only (limited, lower quality). **Strongly recommended.** |

**Key principle:** The server is fully functional with zero API keys and yt-dlp installed. API keys improve quality and unlock additional data sources but are never required for core value.

### Diagnostics / Doctor Flow

**`youtube-mcp doctor`** — a comprehensive diagnostic command that validates the entire stack and reports actionable issues.

```
$ youtube-mcp doctor

🩺 YouTube MCP Server — Doctor

Version: 0.3.0
Platform: darwin (arm64)
Node.js: v22.3.0

Dependencies:
  ✅ yt-dlp: v2025.01.15 (/opt/homebrew/bin/yt-dlp)
  ❌ ffmpeg: not found (needed for future Visual Search module)

API Keys:
  ✅ YOUTUBE_API_KEY: configured
  ⚠️  GEMINI_API_KEY: not set
     → Using local embeddings. Set GEMINI_API_KEY for higher-quality semantic search.

Data Directory:
  ✅ Path: ~/Library/Application Support/youtube-mcp
  ✅ Writable: yes
  ✅ Knowledge base: 3 collections, 847 chunks, 2.1 MB

MCP Client Configs:
  ✅ Claude Desktop: configured (youtube-mcp entry found)
  ⚠️  Claude Code: not configured
     → Run: youtube-mcp setup
  ❌ Cursor: not installed

Connectivity:
  ✅ YouTube API: reachable (200 OK, quota: 9,847/10,000)
  ✅ yt-dlp: can fetch metadata (tested with jNQXAC9IVRw)

Active Collection: stanford-cs229 (45 videos, 2,341 chunks)

Issues Found: 1
  ⚠️  GEMINI_API_KEY not set — local embeddings are functional but lower quality.
     Suggestion: export GEMINI_API_KEY=your-key-here

Overall: ✅ Healthy (1 non-critical warning)
```

**Doctor vs checkHealth:**
- `youtube-mcp doctor` is a CLI command for humans. It's verbose, colorized, and runs active connectivity tests.
- `checkHealth` is an MCP tool for LLMs. It's structured JSON, fast (< 500ms), and does NOT make network calls by default.
- They share underlying diagnostic logic but have different output formats and verbosity levels.

**Diagnostic checks performed by `doctor`:**

| Check | Method | Severity if failed |
|---|---|---|
| Node.js version | `process.version` ≥ 20 | Error |
| yt-dlp presence | `which yt-dlp` | Warning (degraded but functional) |
| yt-dlp version | `yt-dlp --version` | Info |
| ffmpeg presence | `which ffmpeg` | Info (only needed for future Visual Search) |
| YouTube API key | `process.env.YOUTUBE_API_KEY` presence | Info (optional) |
| YouTube API reachability | Light API call (videos.list with quota-cheap params) | Warning (if key configured but unreachable) |
| Gemini API key | `process.env.GEMINI_API_KEY` / `GOOGLE_API_KEY` | Info (optional) |
| Data directory | `fs.accessSync(dir, W_OK)` | Error |
| Knowledge base integrity | Open DB, check tables exist, run `PRAGMA integrity_check` | Error |
| MCP client configs | Scan known config paths, check for youtube-mcp entry | Info |
| Active collection | Check if one is set | Info |

### Shipped Tonight vs Future Packaging Automation

**Shipped tonight (V2 build scope):**

| Item | Status | Notes |
|---|---|---|
| `youtube-mcp doctor` CLI command | **✅ Shipped** | Local stack validation + `--json` + `--live` flags. Reports runtime, keys, detected clients, key transparency. |
| `checkSystemHealth` MCP tool | **✅ Shipped** | Structured JSON with runtime, keys, detected clients, diagnostic checks. |
| Startup stderr diagnostics | **✅ Shipped** | Brief diagnostic block on server start (version, data dir, keys, detected clients). Suppress via `YOUTUBE_MCP_STARTUP_DIAGNOSTICS=0`. |
| Cross-platform `defaultDataDir` | **✅ Shipped** | macOS/Windows/Linux paths resolved via knowledge-base constructor. |
| `package.json` `bin` entry for CLI | **✅ Shipped** | `"youtube-mcp": "dist/cli.js"` — `npx youtube-mcp` works. |
| README install section with key transparency table | **✅ Shipped** | Documents what each key unlocks and what works without it. |
| Client detection scaffolding | **✅ Shipped** | `detectKnownClients()` in `install-diagnostics.ts` detects Claude Desktop, Claude Code, Cursor, VS Code, ChatGPT Desktop, Codex. Surfaced in doctor and checkSystemHealth. |
| CLI subcommands (doctor, version, serve, setup preview, help) | **✅ Shipped** | Full argument parsing in `cli.ts`. Setup prints preview with detected clients + "not automated yet" note. |
| Key transparency in code | **✅ Shipped** | `keyTransparencySummary()` function exported + used in doctor output. |

**Architecture/roadmap (NOT shipped tonight):**

| Item | Status | Notes |
|---|---|---|
| `youtube-mcp setup` wizard (auto-config) | **Roadmap** | Client detection shipped; auto-config writing (JSON merge into client configs) is not. |
| Auto-config writing (merge into client JSON) | **Roadmap** | Careful JSON merge logic needed — don't clobber existing config. |
| `--auto` non-interactive setup | **Roadmap** | After interactive version is proven. |
| npm publish to registry | **Roadmap** | Package is ready structurally (`bin`, `files`, `main` all set). Publish after V2 build is stable. |
| Docker image | **Roadmap** | For SSE deployment. Not needed for stdio/desktop MCP. |
| Homebrew formula | **Roadmap** | Nice-to-have for macOS users. |

### CLI Subcommand Surface (After V2.15)

The `youtube-mcp` CLI gains these subcommands:

```
youtube-mcp              # Start MCP stdio server (default, no subcommand needed)
youtube-mcp serve        # Explicit: start MCP stdio server
youtube-mcp setup        # [Roadmap] Interactive client setup wizard
youtube-mcp setup --auto # [Roadmap] Non-interactive auto-configure
youtube-mcp doctor       # [Tonight] Diagnostic checks
youtube-mcp version      # Print version and exit
```

**CLI architecture note:** Tonight's build adds `doctor` and `version` as argument-parsed subcommands in `cli.ts`. The `setup` wizard is designed but not built — the CLI entrypoint should handle `setup` as an unknown-command gracefully (print "coming soon" or similar).

### Implementation Readiness Checklist (V2.15 — Packaging)

- [x] `youtube-mcp doctor` CLI subcommand with local diagnostic checks
- [x] `youtube-mcp version` CLI subcommand
- [x] CLI argument parsing in `cli.ts` (detect `doctor`, `version`, `serve`, `setup`, `help` vs default stdio)
- [x] README install section with API key transparency table
- [x] README quick-start with `npx youtube-mcp` and client config examples
- [x] Startup stderr diagnostics enhanced with key transparency hints
- [x] `checkSystemHealth` includes runtime info, key status, and detected clients
- [x] `cli.ts` handles unknown subcommands gracefully (`setup` → preview with "not automated yet" note)
- [x] Client detection scaffolding (`detectKnownClients()` with tests)
- [x] `keyTransparencySummary()` utility exported and used in doctor

---

## V2.16) Updated Full Implementation Readiness Checklist (V2 Complete)

Consolidated checklist for tonight's V2 coding run, combining V2.8, V2.14, and V2.15:

### Phase 1: Foundation
- [x] Cross-platform `defaultDataDir()` (macOS/Windows/Linux)
- [x] Startup stderr diagnostics (version, data dir, yt-dlp, API keys, embedding provider, detected clients)
- [x] CLI argument parsing: `doctor`, `version`, `serve`, `setup`, `help`, default=stdio
- [ ] Schema migration — `chunk_type TEXT DEFAULT 'transcript'` on `transcript_chunks`, `PRAGMA user_version` gating (deferred — not needed for tonight's shipped surface)
- [ ] `userFriendlyMessage` on `GracefulError` (deferred)

### Phase 2: Active Collection
- [x] `setActiveCollection` tool
- [x] `clearActiveCollection` tool
- [x] Active collection scoping in `searchTranscripts` (auto-scopes to active when `collectionId` omitted)
- [x] Active collection auto-set on import (`importPlaylist`, `importVideos`)
- [x] `scope` meta in search output (`mode`, `activeCollectionId`, `searchedCollectionIds`)
- [x] `isActive` flag and `activeCollectionId` in `listCollections` output
- [x] Active collection cleared on `removeCollection` when applicable

### Phase 3: Diagnostics & Packaging
- [x] `checkSystemHealth` MCP tool (runtime, keys, detected clients, diagnostic checks, suggestions)
- [x] `checkImportReadiness` tool (transcript preflight/diagnostics)
- [x] `youtube-mcp doctor` CLI command (local stack validation, key transparency, detected clients)
- [x] `youtube-mcp doctor --json` and `youtube-mcp doctor --live` flags
- [x] `youtube-mcp version` CLI command
- [x] Client detection scaffolding (`detectKnownClients()` — Claude Desktop, Claude Code, Cursor, VS Code, ChatGPT Desktop, Codex)
- [x] Key transparency utility (`keyTransparencySummary()`)
- [x] `youtube-mcp setup` preview command (shows detected clients, not automated yet)

### Phase 4: Quality Gates
- [x] Sparse transcript hardening — single-chunk fallback instead of import failure
- [ ] `minTranscriptQuality` parameter on import tools (deferred)
- [ ] `qualityReport` in import outputs (deferred)

### Phase 5: Dossier
- [x] `buildVideoDossier` tool with metadata + transcript readiness + comments + sentiment + provenance

### Phase 6: Comment KB
- [ ] `indexComments` parameter on import tools (deferred — practical bridge shipped via dossier)
- [ ] Comment chunk storage (`chunk_type = 'comment'`) (deferred)
- [ ] `chunkTypes` filter on `searchTranscripts` (deferred)
- [ ] `searchComments` tool (deferred)

### Phase 7: Download Module Extension
- [ ] `listDownloads` tool + `downloaded_assets` table schema (deferred — future media module)
- [ ] Asset tracking in `downloadVideo` output (deferred)

### Phase 8: Registration & Testing
- [x] Register all new tools in `mcp-server.ts` (24 tools total)
- [x] `executeTool` cases for all new tools
- [x] Tests: active collection lifecycle, sparse transcript, import readiness, dossier, system health, client detection (14 tests passing)
- [x] README update: install section, key transparency table, module matrix, CLI commands, quick-start path

### NOT Tonight (Architecture/Roadmap Only)
- [ ] `youtube-mcp setup` wizard (auto-config writing into client JSON)
- [ ] Interactive/non-interactive client detection and config writing
- [ ] npm publish to registry
- [ ] Docker image
- [ ] Homebrew formula
- [ ] Visual/scene search module (V3)
- [ ] Competitive Intel module (V3)
- [ ] Media download module

---
---

# Discovery / Trends — Capability Family

**Added:** 2026-03-15
**Status:** Design-ready specification
**Context:** Rajan clarified the product framing: Discovery/Trends is a first-class capability family, not a single tool. Niche trend analysis is the hero use case. The product must feel full-featured and workable — not aspirational vaporware.

---

## DT.1) Capability Family Overview

**Discovery / Trends** is the module that answers: **"What's happening in my niche right now, and what should I do about it?"**

This is not a dashboard. It's an intelligence surface that a creator, researcher, or brand builder invokes through their MCP client to get actionable trend intelligence from YouTube — scoped to their specific niche, not YouTube-wide trending pages.

### Why This Is a Capability Family (Not a Single Tool)

A single `watchTopicTrends` tool (already shipped in V1) answers a narrow question: "Is this topic trending up, flat, or down?" That's a data point, not a capability.

The **Discovery / Trends family** combines multiple signals into a coherent picture:

| Signal | What It Tells You | Source |
|---|---|---|
| **Publishing velocity** | Are more creators covering this topic? | YouTube Search (sorted by date) |
| **View momentum** | Are recent videos on this topic getting outsized attention? | Video stats (views, engagement) |
| **Creator concentration** | Is this niche dominated by 2-3 channels, or fragmented? | Channel analysis across search results |
| **Content saturation** | Is there so much content that new entries struggle? | Upload density vs engagement trends |
| **Audience demand signals** | What are viewers asking for that nobody's making? | Comment mining, search suggestion patterns |
| **Format gaps** | Is everyone making long-form but nobody's doing Shorts on this? | Format distribution analysis |

No single tool delivers all of this. The capability family orchestrates multiple data pulls into a unified trend intelligence output.

### Hero Use Case: "Find What's Trending in My Niche Right Now"

**The user says:** "What's trending in AI coding assistants on YouTube right now?"

**What the product delivers:**
1. **Momentum snapshot** — This topic is accelerating. 47% more uploads in the last 30 days vs prior 30. Median views per video up 23%.
2. **Leading content** — Top 5 recent videos getting outsized traction (with view counts, engagement rates, and channel info).
3. **Creator landscape** — 3 dominant channels covering this consistently. 8 new entrants in the last 60 days. Fragmentation is increasing.
4. **Saturation assessment** — Moderate saturation. Long-form reviews are crowded. Tutorial/walkthrough format is underserved.
5. **Content gap opportunities** — Audience comments across top videos show demand for: head-to-head comparisons, pricing breakdowns, and "which one for beginners" content. These angles have low coverage relative to demand.
6. **Actionable recommendation** — "The comparison/head-to-head angle is the clearest gap. Recent audience demand is high, coverage is low, and the format works well as both Shorts (highlights) and long-form (full breakdown)."

This is the difference between a tool and a capability. The tool says "trending up." The capability says "here's what to make, and why."

---

## DT.2) Broad Trends vs Niche Trends — The Critical Distinction

YouTube's public "Trending" page shows platform-wide viral content — music videos, celebrity drama, breaking news. That's **broad trend analysis.** It's nearly useless for creators because:
- It's dominated by massive channels with millions of subscribers.
- Topics are ephemeral (trending for 24-48 hours, then gone).
- There's no niche signal — a trending Mr. Beast video tells a coding tutorial creator nothing.

**Niche trend analysis** is fundamentally different:

| Dimension | Broad Trends | Niche Trends |
|---|---|---|
| **Scope** | Platform-wide, all categories | Specific topic/vertical (e.g., "Rust programming", "home espresso") |
| **Timeframe** | 24-48 hour spike | 30-90 day momentum arc |
| **Signal** | Absolute view counts | Relative momentum (this niche vs its own baseline) |
| **Audience** | General public | Niche community with specific interests |
| **Actionability** | Low (too late, too broad) | High (informs next video, validates niche bets) |
| **Data source** | YouTube Trending API | Search-based sampling + statistical analysis |

**This product does niche trend analysis.** We do not replicate YouTube's trending page. We answer a different, more valuable question.

---

## DT.3) How Discovery / Trends Relates to Other Capabilities

Discovery / Trends is not isolated. It connects to and builds on several existing modules:

### Competitors
- `benchmarkChannels` (V3 Competitive Intel) compares specific channels you already know about.
- Discovery / Trends **finds** the channels and content you should be watching — it's the upstream discovery that feeds competitor analysis.
- Flow: Discovery identifies rising creators → user feeds them into benchmarkChannels for deep comparison.

### Momentum
- `mapGrowthTrajectory` (V3) tracks a single channel's growth over time.
- Discovery / Trends tracks **topic-level momentum** — the aggregate signal across all channels publishing on a topic.
- A topic can have strong momentum even if individual channels are flat (many new entrants, each small but collectively significant).

### Saturation
- No existing tool measures saturation. Discovery / Trends introduces this concept.
- Saturation = high publishing velocity + declining per-video engagement. It means the niche is getting crowded.
- This is the "should I still enter this space?" signal that creators desperately need and currently guess at.

### Content Gaps
- `findContentGaps` (V2 Creator Intel) analyzes a **single channel's** coverage vs its niche.
- Discovery / Trends finds **niche-level gaps** — topics the entire creator ecosystem is underserving.
- These are complementary: niche-level gaps tell you what to make; channel-level gaps tell you what you specifically are missing.

---

## DT.4) Data Source Limitations — What Is Actually Buildable

**This section is deliberately honest.** The goal is a product that works, not one that promises magic.

### What YouTube Actually Gives Us

| Data Point | Source | Reliability | Notes |
|---|---|---|---|
| **Recent videos on a topic** | Search API / yt-dlp search | ✅ High | Can filter by date, sort by relevance or view count |
| **Video view counts** | API / yt-dlp metadata | ✅ High | Snapshot at time of query (not historical time series) |
| **Video engagement (likes, comments)** | API (likes) / yt-dlp (partial) | ⚠️ Medium | Comment counts need API key; likes sometimes hidden |
| **Channel metadata** | API / yt-dlp / page extraction | ✅ High | Subscriber count, total videos, creation date |
| **Upload dates** | API / yt-dlp | ✅ High | Can calculate publishing velocity from this |
| **Video tags** | API only | ⚠️ Medium | Many creators don't use tags; API key required |
| **Comments text** | API only | ⚠️ Medium | Requires API key; rate-limited; sample only |
| **Search suggestions** | Page extraction / autocomplete | ⚠️ Medium | Can infer demand from what YouTube suggests |
| **Video duration/format** | API / yt-dlp | ✅ High | Can distinguish Shorts vs long-form |

### What YouTube Does NOT Give Us

| Data Point | Why Not | Implication |
|---|---|---|
| **Historical view counts** | YouTube doesn't expose time-series view data via API | We see a snapshot, not a growth curve. We approximate velocity by comparing recent vs older videos. |
| **Impression/CTR data** | Only available in YouTube Studio for your own channel | We cannot directly measure how many people *saw* a video vs clicked it. |
| **Watch time / retention** | Only available in YouTube Studio | We infer engagement quality from like/comment ratios, not from actual retention curves. |
| **YouTube's internal trending signals** | Proprietary algorithm | We build our own trend detection from observable public data. |
| **Subscriber demographics** | Private | We cannot segment by age, location, or interests beyond what's in public comments. |
| **Monetization data** | Private | We cannot estimate CPM/RPM for a niche directly. |

### What This Means for the Product

1. **Trend detection is statistical, not omniscient.** We sample recent videos, measure their observable metrics, and compute momentum from the distribution. This is genuinely useful but has confidence bounds.
2. **View velocity is approximated.** We compare view counts of videos published 7 days ago vs 30 days ago vs 90 days ago. This reveals momentum patterns but not daily trajectories.
3. **Saturation assessment is directional.** We can detect "many uploads, declining median engagement" — that's a strong saturation signal. But we can't see impressions, so true saturation (high supply, low click-through) is partially obscured.
4. **Content gap detection is comment-driven.** The strongest demand signals come from what people are asking for in comments. This requires an API key and is limited to sampled comments.
5. **All outputs include confidence scores.** We never present approximations as facts. Every trend assessment carries a confidence level and a note on what data was available.

### Buildability Assessment

| Feature | Buildable Now? | Confidence | Key Dependency |
|---|---|---|---|
| Publishing velocity in a niche | ✅ Yes | High | YouTube Search (API or yt-dlp) |
| View momentum (relative) | ✅ Yes | Medium-High | Video stats across time cohorts |
| Creator landscape mapping | ✅ Yes | High | Search + channel metadata |
| Saturation assessment | ✅ Yes | Medium | Velocity + engagement correlation |
| Audience demand signals | ⚠️ Partial | Medium | Comments (API key required) + search suggestions |
| Format gap detection | ✅ Yes | High | Duration/format metadata |
| Content gap identification | ⚠️ Partial | Medium | Comments + transcript analysis across collection |
| Actionable recommendations | ✅ Yes | Medium | Synthesis of above signals |

**Bottom line:** The core of niche trend analysis — momentum, saturation, creator landscape, format gaps — is buildable right now with high confidence. Demand-side signals (what the audience wants) are partially available and improve significantly with an API key for comment access.

---

## DT.5) Tool Specification — Discovery / Trends

### Tool: `analyzeNicheTrends` (Hero Tool)

The primary entry point for niche trend analysis. One call, full picture.

```ts
export interface AnalyzeNicheTrendsInput extends TokenControls {
  niche: string; // e.g., "AI coding assistants", "home espresso", "Rust programming"
  nicheKeywords?: string[]; // additional search terms to broaden/refine the niche signal
  regionCode?: string; // ISO country code
  lookbackDays?: number; // default 90
  sampleSize?: number; // max videos to analyze, default 50, max 100
  includeGaps?: boolean; // default true — requires more API calls, benefits from API key
  includeCreatorMap?: boolean; // default true
}

export interface AnalyzeNicheTrendsOutput {
  niche: string;
  analyzedAt: string; // ISO-8601
  sampleSize: number;

  momentum: {
    direction: "accelerating" | "growing" | "stable" | "slowing" | "declining";
    confidence: number; // 0..1
    publishingVelocity: {
      last30d: number; // videos/day
      prior30d: number; // videos/day
      changePercent: number;
    };
    viewMomentum: {
      medianViewsLast30d?: number;
      medianViewsPrior30d?: number;
      changePercent?: number;
    };
    engagementMomentum: {
      medianEngagementRateLast30d?: number;
      medianEngagementRatePrior30d?: number;
      changePercent?: number;
    };
    summary: string; // Human-readable: "This niche is accelerating — 47% more uploads, 23% higher median views"
  };

  saturation: {
    level: "low" | "moderate" | "high" | "oversaturated";
    confidence: number; // 0..1
    signals: {
      uploadDensity: "sparse" | "moderate" | "dense" | "flooded";
      engagementTrend: "improving" | "stable" | "declining";
      newEntrantRate: number; // new channels publishing on this topic in lookback period
    };
    summary: string; // "Moderate saturation — upload density is rising but engagement is holding steady"
  };

  creatorLandscape?: {
    totalActiveCreators: number; // channels with uploads in lookback period
    dominantCreators: Array<{
      channelId: string;
      channelTitle: string;
      handle?: string;
      uploadsInPeriod: number;
      medianViews?: number;
      estimatedNicheSharePct: number; // share of total views in this niche sample
    }>;
    risingCreators: Array<{
      channelId: string;
      channelTitle: string;
      handle?: string;
      recentUploads: number;
      avgViewsPerVideo?: number;
      signal: string; // "New entrant with above-median engagement"
    }>;
    concentration: {
      top3SharePct: number; // combined niche share of top 3 channels
      fragmentationLevel: "concentrated" | "moderate" | "fragmented";
    };
  };

  contentGaps?: {
    formatGaps: Array<{
      format: "short" | "long" | "tutorial" | "review" | "comparison" | "reaction" | "case_study" | "news";
      currentCoveragePct: number; // what % of recent videos use this format
      demandSignal: "low" | "medium" | "high"; // inferred from engagement rates of this format
      opportunity: string; // "Tutorials get 2.3x the engagement of reviews but are only 12% of uploads"
    }>;
    topicGaps?: Array<{
      subtopic: string;
      demandEvidence: string; // "Mentioned in 23% of comments across top videos"
      currentCoverage: "none" | "sparse" | "moderate" | "well_covered";
      opportunityScore: number; // 0..100
    }>;
    audienceQuestions?: string[]; // Top unanswered questions from comment mining (requires API key)
  };

  leadingContent: Array<{
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt?: string;
    views?: number;
    engagementRate?: number;
    format: "short" | "long" | "unknown";
    whyLeading: string; // "Outsized views relative to channel size — 4.2x channel average"
  }>;

  recommendation: {
    topOpportunity: string; // "Head-to-head comparison content is the clearest gap"
    suggestedAngles: string[];
    timing: string; // "Niche momentum is strong — good time to enter"
    risks: string[]; // "Saturation is moderate — differentiation matters"
  };

  dataQuality: {
    apiKeyUsed: boolean;
    commentDataAvailable: boolean;
    sampleCoverage: string; // "Analyzed 50 of estimated 200+ recent videos"
    limitationsApplied: string[]; // "View velocity approximated from publish-date cohorts", etc.
  };

  provenance: Provenance;
}
```

**Tool description:** `"Analyze what's trending in a specific YouTube niche right now. Returns momentum, saturation, creator landscape, content gaps, and actionable recommendations. This is niche-level intelligence — not YouTube's broad trending page."`

### Tool: `watchTopicTrends` (Existing — Repositioned)

The existing `watchTopicTrends` (V1) remains as a **lightweight, fast** trend check. It's the quick pulse — "is this topic up, flat, or down?" — without the full niche analysis.

**Relationship:** `watchTopicTrends` is the scout. `analyzeNicheTrends` is the full intelligence briefing. A creator might use `watchTopicTrends` daily to monitor 5 topics, then use `analyzeNicheTrends` weekly on the one that's moving.

### Tool: `compareNiches`

Compare two or more niches side-by-side to decide where to focus.

```ts
export interface CompareNichesInput extends TokenControls {
  niches: Array<{
    name: string;
    keywords?: string[];
  }>; // 2..5 niches
  regionCode?: string;
  lookbackDays?: number; // default 90
  samplePerNiche?: number; // default 30
}

export interface CompareNichesOutput {
  niches: Array<{
    name: string;
    momentum: AnalyzeNicheTrendsOutput["momentum"];
    saturation: AnalyzeNicheTrendsOutput["saturation"];
    sampleSize: number;
  }>;
  comparison: {
    bestMomentum: string; // niche name
    lowestSaturation: string; // niche name
    bestOpportunity: string; // niche name — composite score
    rationale: string;
  };
  provenance: Provenance;
}
```

**Tool description:** `"Compare 2-5 niches side by side on momentum, saturation, and opportunity. Use to decide which niche to focus on or validate a niche bet."`

### Tool: `trackNicheOverTime`

Designed for repeated invocation — build a trend history by running weekly/monthly.

```ts
export interface TrackNicheOverTimeInput extends TokenControls {
  niche: string;
  nicheKeywords?: string[];
  regionCode?: string;
  snapshotId?: string; // if provided, compares against a previous snapshot
}

export interface TrackNicheOverTimeOutput {
  niche: string;
  snapshotId: string; // persist this to compare later
  snapshotAt: string; // ISO-8601
  current: {
    publishingVelocity: number; // videos/day
    medianViews?: number;
    medianEngagementRate?: number;
    activeCreators: number;
    saturationLevel: "low" | "moderate" | "high" | "oversaturated";
  };
  comparison?: {
    previousSnapshotId: string;
    previousSnapshotAt: string;
    velocityChange: number; // percent
    viewsChange?: number; // percent
    engagementChange?: number; // percent
    creatorCountChange: number;
    saturationShift: string; // "stable" | "increasing" | "decreasing"
    narrative: string; // "Since your last check 14 days ago, this niche has..."
  };
  provenance: Provenance;
}
```

**Tool description:** `"Take a snapshot of a niche's current state. Optionally compare against a previous snapshot to track changes over time. Use weekly or monthly for trend monitoring."`

---

## DT.6) Implementation Strategy

### What's Buildable Now (V2.5 Scope)

| Tool | Complexity | Dependencies | Build Order |
|---|---|---|---|
| `analyzeNicheTrends` (hero) | Medium-High | Search + video stats + channel metadata + (optional) comments | First — this is the hero |
| `watchTopicTrends` | Already shipped | — | Repositioned, no changes needed |
| `compareNiches` | Medium | Wraps `analyzeNicheTrends` logic | Second — reuses hero tool internals |
| `trackNicheOverTime` | Low-Medium | Snapshot persistence (add table to SQLite) | Third — lightweight |

### Data Pipeline for `analyzeNicheTrends`

```
1. Search YouTube for niche keywords (sorted by date, last N days)
   → Get video IDs + basic metadata
   
2. Fetch stats for sampled videos (fallback chain applies)
   → View counts, like counts, comment counts, durations, publish dates
   
3. Group videos into time cohorts (last 30d, 30-60d, 60-90d)
   → Calculate per-cohort medians for views, engagement, publishing velocity
   
4. Extract unique channels from results
   → Calculate per-channel contribution, identify dominant vs rising creators
   
5. Compute saturation signals
   → Cross-correlate upload density with engagement trends
   
6. [If API key + includeGaps] Sample comments from top videos
   → Mine for recurring questions, complaints, requests
   
7. Analyze format distribution
   → Count Shorts vs long-form, correlate format with engagement
   
8. Synthesize recommendation
   → Combine momentum + saturation + gaps into actionable guidance
```

### Schema Addition

```sql
-- For trackNicheOverTime snapshot persistence
CREATE TABLE IF NOT EXISTS niche_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  niche TEXT NOT NULL,
  keywords TEXT, -- JSON array
  region_code TEXT,
  snapshot_at TEXT NOT NULL, -- ISO-8601
  data TEXT NOT NULL, -- JSON blob of snapshot metrics
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_niche_snapshots_niche ON niche_snapshots(niche, snapshot_at);
```

---

## DT.7) Updated Module Map Entry

**Add to the Module Map table in V2.12:**

| Module | Scope | Default? | Dependencies Beyond Core | Status |
|---|---|---|---|---|
| **Discovery / Trends** | Niche trend analysis, momentum, saturation, creator landscape, content gaps, niche comparison, trend tracking | Always on | Comments need API key for demand signals; core analysis works without | **V2.5 — design ready, build next** |

**Module Capability Matrix addition:**

| Module | Needs API Key? | Needs yt-dlp? | Needs ffmpeg? | Needs Vision Model? | Disk Impact | Token Cost |
|---|---|---|---|---|---|---|
| Discovery / Trends | Optional (better demand signals with) | Recommended (search fallback) | No | No | ~1MB (snapshots) | Medium-High (multi-search aggregation) |

---

## DT.8) Tool Catalog Update

After Discovery / Trends, add to V2.10 tool summary:

| Tool | Category | Version | Status |
|---|---|---|---|
| `analyzeNicheTrends` | **Discovery / Trends** | V2.5 | **New — hero tool** |
| `compareNiches` | **Discovery / Trends** | V2.5 | **New** |
| `trackNicheOverTime` | **Discovery / Trends** | V2.5 | **New** |
| `watchTopicTrends` | **Discovery / Trends** | V1 | Shipped (repositioned from Core) |

**Total tool count: 28** (25 existing + 3 new Discovery / Trends tools)

---

## DT.9) Risks and Mitigations (Discovery / Trends)

### Risk: Search-based sampling introduces bias
**Mitigation:** YouTube search results are ranked by relevance/recency, not random. We acknowledge this in `dataQuality.limitationsApplied`. Sample size is configurable (up to 100). Multiple keyword variations broaden coverage.

### Risk: View counts are snapshots, not trajectories
**Mitigation:** We compare cohorts (last 30d vs prior 30d) rather than tracking individual videos over time. This gives directional momentum without requiring repeated polling. `trackNicheOverTime` builds history through repeated snapshots.

### Risk: Saturation assessment without impression data is approximate
**Mitigation:** We use upload density × engagement trend as a proxy. Declining engagement + rising uploads is a strong saturation signal even without impression data. Confidence scores reflect this limitation.

### Risk: Content gap detection is weak without API key (no comments)
**Mitigation:** Format gap analysis works without API key (based on video metadata). Topic gaps and audience questions require comment sampling (API key). `dataQuality.commentDataAvailable` tells the user exactly what they're missing.

### Risk: "Niche" is ambiguous — user might pass too broad or too narrow a topic
**Mitigation:** `nicheKeywords` lets users refine. `dataQuality.sampleCoverage` tells them how much of the niche they captured. If sample is too small (< 10 videos in lookback), we emit a warning suggesting broader keywords.

### Risk: Token cost is higher than single-tool calls (multi-search aggregation)
**Mitigation:** Default sample size of 50 balances cost vs coverage. `compact: true` by default. `includeGaps` and `includeCreatorMap` can be disabled for faster, cheaper runs.

---

## DT.10) Implementation Readiness Checklist (Discovery / Trends)

- [ ] `analyzeNicheTrends` tool — full implementation with momentum, saturation, creator landscape, gaps, recommendation
- [ ] `compareNiches` tool — wraps analyzeNicheTrends internals for side-by-side comparison
- [ ] `trackNicheOverTime` tool — snapshot persistence + comparison logic
- [ ] `niche_snapshots` SQLite table + migration
- [ ] `watchTopicTrends` repositioned in module map (no code change needed)
- [ ] Register all 3 new tools in `mcp-server.ts`
- [ ] `checkHealth` / `checkSystemHealth` updated to include Discovery / Trends module status
- [ ] Tests: niche trend analysis with mock search data, saturation calculation, cohort comparison
- [ ] README update: Discovery / Trends section with hero use case example
---

## V2.17) Discovery / Trends Module — Shipped

### Module Name
**Discovery / Trends**

### Hero Use Case
**"Find what's trending in my niche right now."**

### Tools

#### `discoverNicheTrends`
Given a niche/topic string, runs two YouTube search passes (recent by date + top by viewCount) to build a multi-signal view:
- **Momentum** — splits results by recency, compares median views → accelerating / steady / decelerating
- **Saturation** — view concentration ratio (top-third share) → low / medium / high
- **Content gaps** — heuristic scan for under-represented formats/angles (Shorts gap, tutorial gap, comparison content gap, data-driven gap)
- **Format breakdown** — Shorts vs long-form vs unknown percentage
- **Recurring keywords** — title/tag frequency analysis
- Returns explicit `limitations[]` array — no claims about YouTube internal data

#### `exploreNicheCompetitors`
Given a niche/topic string:
- Searches YouTube for top results, groups by channel
- Ranks channels by peak video views in the niche
- Per-channel: sampled video count, median views, median engagement, top video
- Landscape summary: total channels, median views, top performer
- Honest limitations about search-based discovery

### Data Sources
- **Primary:** YouTube Data API v3 search (when `YOUTUBE_API_KEY` configured)
- **Fallback:** yt-dlp search (when no API key)
- **Enrichment:** `inspectVideo` for tags, engagement rates, view velocity

### What It CAN Do
- Trend momentum detection (accelerating / decelerating / steady)
- Saturation analysis (crowded vs open niches)
- Content gap identification (format and topic gaps)
- Format breakdown (Shorts vs long-form distribution)
- Competitor channel landscape mapping

### What It CANNOT Do (Honestly)
- Access YouTube's internal trending/explore feed (not in public API)
- Get impression data, CTR, or watch time (creator-only analytics, requires OAuth)
- Measure true search volume (would need Google Trends API)
- Guarantee comprehensive niche coverage (limited to search result sampling)
- Track trends over time (no persistence layer yet — V3 candidate)

### Dependencies
- None beyond core (yt-dlp recommended)
- Better results with `YOUTUBE_API_KEY` (view counts, tags, engagement stats)

### Analysis Functions (in `analysis.ts`)
- `computeNicheMomentum()` — recent-vs-older view ratio, 4+ video minimum
- `computeNicheSaturation()` — concentration-ratio-based scoring
- `detectContentGaps()` — heuristic gap detection with opportunity scoring
- `computeFormatBreakdown()` — Shorts/long/unknown percentage computation

### Tests
- 12 new tests in `trends-discovery.test.ts`
- Covers: momentum (insufficient data, accelerating, decelerating, steady), saturation (insufficient, high, low), content gaps (shorts, tutorial, well-covered), format breakdown

---

## V2.18) Media Asset Module — Shipped

### Module Name
**Media / Assets**

### Purpose
Moves youtube-mcp beyond transcript-only by supporting local storage and management of downloaded media files. Foundation layer for future visual search.

### Tools

#### `downloadAsset`
Download video/audio/thumbnail via yt-dlp. Returns manifest entry with file path and metadata. Deduplicates — returns cached asset if already exists.

#### `listMediaAssets`
List stored assets, filtered by video ID and/or kind (video/audio/thumbnail/keyframe). Includes store-wide stats.

#### `removeMediaAsset`
Remove specific asset or all assets for a video. Optionally deletes files from disk.

#### `extractKeyframes`
Extract keyframe images from a downloaded video at configurable intervals using ffmpeg. Requires video downloaded first.

#### `mediaStoreHealth`
Health check: disk usage, asset counts, ffmpeg/yt-dlp binary availability and versions.

### Architecture
- **Separate SQLite database** — `~/.youtube-mcp/media/media-manifest.db`
- **`MediaStore`** — SQLite-backed asset manifest (register, list, query, remove)
- **`MediaDownloader`** — yt-dlp wrapper with deduplication
- **`ThumbnailExtractor`** — ffmpeg keyframe extraction at configurable intervals
- **File organization:** `~/.youtube-mcp/media/files/{videoId}/` with predictable naming

### What It Does NOT Do
- No visual search or classification — produces raw image files only
- No video format conversion
- No automatic cleanup/retention policy
- No progress streaming for large downloads
- No batch download (single video per call)

### Dependencies
- `yt-dlp` (required for downloads)
- `ffmpeg` (required for keyframe extraction)
- No new npm dependencies

### Tests
- 9 unit tests in `media-store.test.ts`
- Covers: register/retrieve, list, filter, stats, remove, summary, mime guessing, metadata

---

## V2.19) Comment Knowledge Base Module — Shipped

### Module Name
**Comment KB**

### Purpose
Parallel knowledge base for comments — index, store, and semantically search YouTube comments alongside (but separate from) transcript search.

### Tools

#### `importComments`
Fetch + index a video's comments into a searchable collection. Reuses existing `readComments` pipeline (YouTube API → yt-dlp fallback). Re-importing replaces old index cleanly.

#### `searchComments`
Semantic search over indexed comments with ranked results. Supports `videoIdFilter` for multi-video collections. Like-count boost (capped at 10%) surfaces community-validated insights.

#### `listCommentCollections`
List comment collections with video/chunk counts.

#### `setActiveCommentCollection`
Set default collection scope for comment search.

#### `clearActiveCommentCollection`
Clear active collection (search fans out to all collections).

#### `removeCommentCollection`
Delete a comment collection and its index.

### Architecture
- **Separate tables** in shared `knowledge-base.sqlite` database
- Tables: `comment_collections`, `comment_collection_videos`, `comment_chunks`, `comment_collection_models`, `comment_app_state`
- **Source separation:** Transcript KB and comment KB are independent — different tables, different active collection state, different search paths
- **Same TF-IDF + LSA hybrid search** as transcript KB
- **Like-count boost:** High-engagement comments get up to 10% relevance boost
- **Reply tracking:** `isReply` flag and `parentAuthor` for thread context
- **Comment filtering:** Short/empty comments (<5 chars or <2 tokens) excluded

### What It Does NOT Do
- No playlist-level comment import (single video only)
- No Gemini embedding support (uses local LSA only — portable from transcript KB)
- No combined transcript+comment search (intentionally separate for cleaner relevance)
- No comment sentiment enrichment in search results

### Dependencies
- None beyond core
- Comments require `YOUTUBE_API_KEY` for reliable fetching

### Tests
- 6 tests in `comment-knowledge-base.test.ts`
- Covers: full lifecycle, active collection management, short comment filtering, video replacement, ID generation, search with video filter

---

## V2.20) v0.3.0 Implementation Summary

### What Shipped
- **37 MCP tools** (was 24 in v0.2.16)
- **15,724 lines** of TypeScript
- **50 tests** passing (was 22)
- **3 new modules:** Discovery/Trends, Media/Assets, Comment KB

### New Tool Inventory (13 new tools)

| # | Tool | Module |
|---|---|---|
| 25 | `discoverNicheTrends` | Discovery / Trends |
| 26 | `exploreNicheCompetitors` | Discovery / Trends |
| 27 | `downloadAsset` | Media / Assets |
| 28 | `listMediaAssets` | Media / Assets |
| 29 | `removeMediaAsset` | Media / Assets |
| 30 | `extractKeyframes` | Media / Assets |
| 31 | `mediaStoreHealth` | Media / Assets |
| 32 | `importComments` | Comment KB |
| 33 | `searchComments` | Comment KB |
| 34 | `listCommentCollections` | Comment KB |
| 35 | `setActiveCommentCollection` | Comment KB |
| 36 | `clearActiveCommentCollection` | Comment KB |
| 37 | `removeCommentCollection` | Comment KB |
