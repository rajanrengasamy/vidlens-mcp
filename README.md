<p align="center">
  <h1 align="center">youtube-mcp</h1>
  <p align="center">
    <strong>The YouTube intelligence layer for MCP — zero config, actually works.</strong>
  </p>
  <p align="center">
    <a href="#install">Install</a> •
    <a href="#why-this-exists">Why</a> •
    <a href="#tools">Tools</a> •
    <a href="#how-it-works">How it works</a> •
    <a href="#examples">Examples</a>
  </p>
</p>

---

## Why this exists

Every YouTube MCP server I tried was broken in the same ways:

- **API key required to do anything.** You have to set up Google Cloud Console, create a project, enable the Data API, generate a key... just to get a transcript. Most people give up here.
- **Long videos crash.** A 2-hour lecture exceeds the 1MB MCP message limit and the server just dies. ([Real issue](https://github.com/anaisbetts/mcp-youtube/issues/1) on the most popular YouTube MCP server.)
- **Raw API dumps waste your context window.** The YouTube API returns massive nested JSON with eTags, thumbnails, localization data. Your LLM doesn't need any of that.
- **No analysis, just data.** You ask "how's the audience responding?" and get back 200 raw comments. Thanks.

`youtube-mcp` fixes all of this.

## What makes it different

| | youtube-mcp | Others |
|---|---|---|
| **Setup** | `npx youtube-mcp` — works immediately | API key required |
| **Long videos** | Auto-chunking, pagination, chapter-aware | Crash on >1MB |
| **Fallback** | API → yt-dlp → page extraction → graceful error | API fails = everything fails |
| **Output size** | 75-87% smaller (token-optimized) | Raw API payloads |
| **Analysis** | Sentiment, hook scoring, content gaps | Just retrieval |
| **Provenance** | Every response tells you which source was used | Black box |

## Install

### macOS quick start (Claude Desktop first)

```bash
brew install yt-dlp
cd /absolute/path/to/youtube-mcp
npm install
npm run build
node dist/cli.js doctor --no-live
node dist/cli.js setup
```

What this does tonight:

- `doctor` checks Node, `yt-dlp`, writable data dir, key presence, detected clients, and Claude Desktop registration state.
- `setup` safely merges `youtube-mcp` into Claude Desktop's config without wiping your other MCP servers.
- default macOS data dir: `~/Library/Application Support/youtube-mcp`

After `setup`, fully quit and reopen Claude Desktop.

### What is automated vs partial tonight

**Automated**
- Claude Desktop config detection on macOS
- safe merge into `~/Library/Application Support/Claude/claude_desktop_config.json`
- `youtube-mcp` registration pointing at the current local `dist/cli.js`
- `YOUTUBE_MCP_DATA_DIR` persistence
- optional persistence of `YOUTUBE_API_KEY`, `GEMINI_API_KEY`, or `GOOGLE_API_KEY`

**Partial / manual**
- ChatGPT Desktop / Ultra: detection plus generated manual MCP entry, but no blind auto-write because the app's config/storage path is still evolving
- Claude Code / Cursor / VS Code / Codex: detection only in this pass

### Key transparency

API keys are never required for core value. They improve quality and unlock additional data sources.

| Key | What it unlocks | What works without it |
|-----|----------------|----------------------|
| `YOUTUBE_API_KEY` | Higher-fidelity metadata, search via API, subscriber counts, comment API access | Transcript import/search, playlist expansion, local KB operations, yt-dlp/page-extract fallbacks |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Higher-quality Gemini embeddings for transcript semantic search | Core transcript retrieval/import, local hybrid search, comments/sentiment, diagnostics, all playlist workflows |

If you want the CLI to persist keys into Claude Desktop config during setup:

```bash
node dist/cli.js setup --youtube-api-key "your_key_here"
node dist/cli.js setup --gemini-api-key "your_gemini_key_here"
```

Then use `embeddingProvider: "gemini"` when importing. Without it, a zero-config local TF-IDF + LSA index is used automatically.

### CLI commands

`youtube-mcp` now ships a real packaging/onboarding CLI surface:

```bash
youtube-mcp                # Start MCP stdio server (default)
youtube-mcp serve          # Start MCP stdio server explicitly
youtube-mcp version        # Print version
youtube-mcp doctor         # Run local install/health diagnostics
youtube-mcp doctor --no-live
youtube-mcp setup          # Auto-configure Claude Desktop + print ChatGPT manual entry
youtube-mcp setup --print-only
```

**`youtube-mcp doctor`** validates your local stack: Node version, `yt-dlp`, storage, key presence, detected MCP clients, and Claude Desktop registration status.

### Startup diagnostics

When the MCP server starts, it emits a brief diagnostic summary to stderr (not stdout — that's the MCP transport). This gives you ambient awareness of your configuration state without needing to call a tool. Suppress with `YOUTUBE_MCP_STARTUP_DIAGNOSTICS=0`.

### Requirements

- Node.js ≥ 20
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) installed (`brew install yt-dlp` or `pip install yt-dlp`)

## Platform modules

Think of `youtube-mcp` as a **program/platform with modules**, not one monolithic feature blob.

### 1) Core module — shipped tonight
The base platform is about **single-video + playlist intelligence built around transcript text and metadata**:
- single video inspection and transcript reading
- playlist expansion and batch analysis
- transcript import into a local knowledge base
- transcript semantic search with active collection scoping

If you only use the core module, you still get a strong product tonight.

### 2) Audience module — shipped as an extension tonight
Comments and sentiment are treated as an **extension/module on top of the core**, not the core itself:
- `readComments`
- `measureAudienceSentiment`
- comment/sentiment sections inside `buildVideoDossier`

This module now has both an analysis layer (`readComments`, `measureAudienceSentiment`, `buildVideoDossier`) and a separate persistent **comment knowledge base** for search (`importComments`, `searchComments`, collection controls).

### 3) Diagnostics module — shipped tonight
A separate operational layer to make the product usable in Claude Desktop:
- `checkImportReadiness`
- `checkSystemHealth`
- active collection controls and search scope visibility

### 4) Comment knowledge-base module — shipped tonight
A second local KB now exists specifically for audience/comment search:
- `importComments`
- `searchComments`
- `listCommentCollections` / `setActiveCommentCollection` / `clearActiveCommentCollection` / `removeCommentCollection`

It is separate from the transcript KB on purpose, so transcript search remains transcript-only and comment search remains comment-aware.

### 5) Media module — shipped foundation tonight
The platform can now manage local media assets honestly, without pretending visual search exists yet:
- `downloadAsset`
- `listMediaAssets`
- `removeMediaAsset`
- `extractKeyframes`
- `mediaStoreHealth`

What this means: you can download video/audio/thumbnails, inspect what is stored locally, and extract raw keyframes for downstream vision workflows.

### 6) Future visual/scene module — still not shipped
Still **not implemented tonight**:
- natural-language search over visual/frame-level content
- scene, object, or shot-level retrieval

**Honesty note:** `searchTranscripts` still searches **transcript text only**. The shipped media module stores assets and extracts frames, but it does **not** claim visual understanding or frame search.

## Tools

### 37 tools across the core platform, extension modules, local knowledge bases, diagnostics, discovery, and media handling

#### Core Retrieval
| Tool | What it does |
|------|-------------|
| `findVideos` | Search YouTube with compact, engagement-scored results |
| `inspectVideo` | Video metadata, stats, engagement ratios, transcript availability |
| `inspectChannel` | Channel summary with posting cadence and growth heuristics |
| `listChannelCatalog` | Recent uploads filtered by format (Shorts/long-form), sorted by performance |

#### Core transcript module
| Tool | What it does |
|------|-------------|
| `readTranscript` | Full transcript with 4 modes: `full`, `summary`, `key_moments`, `chapters`. Long-video aware — auto-chunks and paginates |

#### Audience/comments extension
| Tool | What it does |
|------|-------------|
| `readComments` | Top-level comments with optional reply threads |
| `measureAudienceSentiment` | Sentiment scoring, theme extraction, risk signals, representative quotes |
| `buildVideoDossier` | One-shot workflow: core video metadata + transcript readiness, optionally extended with comments and sentiment |

#### Batch & Playlist
| Tool | What it does |
|------|-------------|
| `analyzeVideoSet` | Analyze multiple videos in one call — partial success, per-item provenance |
| `expandPlaylist` | Playlist → video list with metadata |
| `analyzePlaylist` | Full playlist analysis with aggregate stats |

#### Transcript Knowledge Base
| Tool | What it does |
|------|-------------|
| `importPlaylist` | Import a playlist into a persistent local transcript collection and, by default, make it the active search focus |
| `importVideos` | Import ad-hoc videos into a new or existing collection and, by default, make it the active search focus |
| `searchTranscripts` | Search imported transcript-text chunks with hybrid semantic ranking (local or Gemini). If `collectionId` is omitted, it uses the active collection by default |
| `listCollections` | List local collections, chunk counts, optional video membership, and the current active collection |
| `setActiveCollection` | Explicitly set the default collection that search should focus on |
| `clearActiveCollection` | Clear the active search focus and fan search back out across all collections |
| `removeCollection` | Delete a local collection and its stored search index |

#### Comment Knowledge Base
| Tool | What it does |
|------|-------------|
| `importComments` | Import a video's public comments into a persistent local comment collection |
| `searchComments` | Search imported comments with ranked matches, author names, and reply awareness |
| `listCommentCollections` | List local comment collections and the active comment collection |
| `setActiveCommentCollection` | Focus comment search on one collection by default |
| `clearActiveCommentCollection` | Clear active comment focus and search across all comment collections again |
| `removeCommentCollection` | Delete a stored comment collection and its local search index |

#### Diagnostics & Setup
| Tool | What it does |
|------|-------------|
| `checkImportReadiness` | Diagnose whether a specific video is importable tonight: transcript availability, sparse transcript warnings, yt-dlp failures, and API/setup notes |
| `checkSystemHealth` | Check local storage, yt-dlp, YouTube API setup, and Gemini embedding readiness |

#### Discovery & Creator Intelligence
| Tool | What it does |
|------|-------------|
| `scoreHookPatterns` | Score the first 30 seconds of videos for hook effectiveness |
| `researchTagsAndTitles` | Mine winning title structures and high-signal tags from search results |
| `compareShortsVsLong` | Compare Shorts vs long-form performance with mix recommendations |
| `recommendUploadWindows` | Best upload days/times based on historical posting patterns |
| `discoverNicheTrends` | Sample a niche via YouTube search and return momentum, saturation, content gaps, and format mix |
| `exploreNicheCompetitors` | Surface active channels and top performers for a niche query |

#### Media Assets
| Tool | What it does |
|------|-------------|
| `downloadAsset` | Download a video, audio track, or thumbnail into the local media store |
| `listMediaAssets` | Inspect stored media assets and aggregate asset-store stats |
| `removeMediaAsset` | Remove one asset or all assets for a video |
| `extractKeyframes` | Extract raw keyframe images from a downloaded local video via ffmpeg |
| `mediaStoreHealth` | Check the media store and ffmpeg/yt-dlp availability |

## How it works

### Three-tier fallback chain

Every tool call follows this strategy:

```
┌─────────────────────┐
│  YouTube API v3     │ ← Best data (when API key is set)
│  (primary)          │
└────────┬────────────┘
         │ fails/missing
         ▼
┌─────────────────────┐
│  yt-dlp             │ ← Works without API key
│  (fallback)         │
└────────┬────────────┘
         │ fails
         ▼
┌─────────────────────┐
│  Page extraction    │ ← HTML/JSON-LD parsing
│  (last resort)      │
└────────┬────────────┘
         │ fails
         ▼
┌─────────────────────┐
│  Graceful error     │ ← Actionable message + retry guidance
│  (never silent)     │
└─────────────────────┘
```

Every response includes **provenance** — you always know which source tier was used, whether data is partial, and the fallback depth.

### Long-video handling

Long videos (lectures, podcasts, livestreams) don't crash the server:

- **Auto-detection:** If a transcript exceeds ~8K tokens, `full` mode auto-downgrades to `key_moments` with a warning
- **Pagination:** Request `full` mode with `offset` and `limit` to read long transcripts in pages
- **Chapter mode:** Uses YouTube chapter markers as natural segment boundaries — ideal for lectures
- **Every response** includes `longVideoHandling` metadata so your LLM knows the total length

### Transcript knowledge base with pluggable embeddings

This knowledge base belongs to the **core transcript module**. It indexes **transcript text**, not raw video files and not visual/frame-level content.

The knowledge-base flow is local, persistent, and supports two embedding modes:

- **Storage:** SQLite (`knowledge-base.sqlite`) in `YOUTUBE_MCP_DATA_DIR` or `~/Library/Application Support/youtube-mcp`
- **Import path:** playlist/video expansion → transcript fetch → chunking → embedding index
- **Search path:** hybrid ranking over stored chunks with timestamp deep links back to YouTube
- **Collection UX:** imports can create or extend collections; by default, imports also set the new/updated collection as the **active collection** so follow-up `searchTranscripts` calls stay safely scoped. Use `setActiveCollection`, `clearActiveCollection`, and `listCollections` to manage focus explicitly

#### Embedding providers

| Provider | Model | Dimensions | Requires | How to activate |
|----------|-------|------------|----------|----------------|
| **local** (default) | TF-IDF + latent semantic projection | 12 max | Nothing | Just import — it's the default |
| **gemini** | `gemini-embedding-2-preview` | 768 (configurable 128–3072) | `GEMINI_API_KEY` | Set `embeddingProvider: "gemini"` on import |

**Per-import control:** each `importPlaylist` / `importVideos` call accepts `embeddingProvider`, `embeddingModel`, and `embeddingDimensions` parameters. The collection remembers which embedding was used. Search automatically picks the right strategy.

**Environment variables for Gemini:**

| Variable | Default | What it does |
|----------|---------|-------------|
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | — | API key for Gemini embeddings |
| `YOUTUBE_MCP_EMBEDDING_PROVIDER` | `local` | Default provider when not specified per-call |
| `YOUTUBE_MCP_GEMINI_MODEL` | `gemini-embedding-2-preview` | Gemini model name |
| `YOUTUBE_MCP_GEMINI_DIMENSIONS` | `768` | Output dimensions (128–3072) |

#### Honesty note on the local provider

The local embedding path is **not** the original PRD plan (`sqlite-vec` + transformer embeddings). It's a zero-config hybrid index:
- TF-IDF lexical scoring over transcript chunks
- latent semantic projection built from the imported corpus itself (power-iteration SVD)
- cosine reranking over the latent space

That means:
- it does perform real semantic expansion beyond exact keyword matching
- it works without API keys, model downloads, or native dependencies
- it works best when the query shares some vocabulary with the imported corpus
- Gemini embeddings give significantly better semantic quality (true dense vectors from a foundation model)

#### Search scoring blend

- **Gemini collections:** 35% lexical + 65% Gemini cosine similarity. Query is embedded at search time.
- **Local collections:** 35% lexical + 65% local LSA similarity. Falls back to pure lexical if corpus is too small.

### V2 diagnostics tonight

The diagnostics module is separate from both the core transcript module and the audience/comments extension. Its job is to make the platform explain itself clearly when imports or setup fail.

Two new diagnostics-first tools are meant to keep Claude Desktop usable under real-world failures:

- **`checkImportReadiness`** — tells you if a video is importable *before* you start indexing. It reports:
  - whether public captions were actually fetchable
  - whether the transcript is sparse
  - whether `yt-dlp` itself is missing/broken
  - whether YouTube API setup is absent or degraded
  - a suggested collection id for the import flow
- **`checkSystemHealth`** — gives a setup/status snapshot for:
  - local storage
  - `yt-dlp`
  - YouTube API key presence/live probe
  - Gemini embedding key presence/live probe

### Sparse transcript hardening

V2 no longer throws away low-content transcripts just because they are too short to form multiple clean time windows.

If chunk filtering would previously have produced zero searchable chunks, the importer now falls back to a **single whole-transcript chunk**. That means:

- short caption tracks can still be imported
- terse videos can still show up in search
- search quality may be shallower, but import no longer fails unnecessarily

### Token optimization

Responses are 75-87% smaller than raw YouTube API payloads:

| API call | Raw YouTube API | youtube-mcp | Savings |
|----------|----------------|-------------|---------|
| Video details | ~2.9 KB | ~0.6 KB | **75%** |
| Channel stats | ~1.9 KB | ~0.2 KB | **87%** |
| Search results | ~3.4 KB | ~1.2 KB | **64%** |

No thumbnails. No eTags. No localization arrays. Just the data your LLM needs to reason.

## Examples

### "Summarize this video"

Ask your AI assistant:

> "Read the transcript of https://youtube.com/watch?v=abc123 and give me the key takeaways"

The assistant calls `readTranscript` with `mode: "key_moments"` → gets timestamped segments → synthesizes a summary.

### "Analyze this channel's content strategy"

> "Look at @mkbhd's last 20 videos. Compare Shorts vs long-form performance, and tell me what upload schedule they follow."

The assistant calls `listChannelCatalog` → `compareShortsVsLong` → `recommendUploadWindows` → gives you a complete content strategy breakdown.

### "Score the hooks on these videos"

> "Take these 5 video URLs and score their opening hooks. Which one grabs attention best?"

The assistant calls `scoreHookPatterns` → returns hook scores, types (question/promise/shock/story), and improvement suggestions.

### "What's the audience saying?"

> "Read the comments on this video and tell me the overall sentiment. Are there any red flags?"

The assistant calls `measureAudienceSentiment` → returns sentiment distribution, theme clusters, risk signals, and representative quotes.

### "Analyze an entire playlist"

> "Analyze the first 10 videos in this Stanford CS229 playlist — hook patterns and sentiment."

The assistant calls `analyzePlaylist` → processes each video with partial-success handling → returns per-video analysis plus aggregate benchmarks.

### "Can I import this video tonight?"

> "Before we import this, check whether the transcript is actually available and tell me what's likely to break."

The assistant calls `checkImportReadiness` → returns transcript fetch status, sparse-transcript warnings, yt-dlp failures, API/setup notes, and a suggested collection id.

### "Give me the full picture on one video"

> "Build me a dossier on this video — metadata, transcript status, what the audience is saying, and overall sentiment."

The assistant calls `buildVideoDossier` → returns a single bundle with metadata, transcript readiness, transcript summary, comment sample, sentiment, risk signals, and provenance.

### "Turn a playlist into a searchable knowledge base"

> "Import this playlist, then search it for every mention of title strategy and opening hooks."

The assistant calls:
1. `importPlaylist` with `embeddingProvider: "gemini"` (or omit for local default)
2. `searchTranscripts` — by default this now stays scoped to the active collection created by the import
3. optionally `listCollections` to inspect embedding info / active focus, `setActiveCollection` to switch focus, `clearActiveCollection` to search across everything again, or `removeCollection` to clean up

Search results include ranked transcript chunks, video metadata, timestamp URLs, semantic + lexical scores, and the search scope used for that query.

## Roadmap

### Shipped ✅
- 37 MCP tools (retrieval + transcript KB + comment KB + diagnostics + discovery + media handling)
- Three-tier fallback chain with provenance
- Token-optimized compact outputs
- Long-video safeguards (auto-chunking, pagination, chapters)
- Batch and playlist operations with partial success
- Local transcript knowledge base with pluggable embeddings:
  - `importPlaylist` / `importVideos` — with `embeddingProvider: "local" | "gemini"` option
  - `searchTranscripts` — auto-detects embedding type per collection and now supports active-collection scoping
  - `listCollections` — shows embedding provider/model/dimensions plus active collection state
  - `setActiveCollection` / `clearActiveCollection`
  - `removeCollection`
- Diagnostics and import hardening:
  - `checkImportReadiness` — transcript/provider/yt-dlp preflight
  - sparse transcript fallback to a single searchable chunk
  - `checkSystemHealth` — setup/provider/storage health view
  - `buildVideoDossier` — unified single-video workflow

### Still not shipped yet 🚧
- **PRD-native local vector stack** — `sqlite-vec` + local transformer embeddings (Gemini cloud embeddings are shipped)
- **Unified multimodal retrieval** — transcript search, comment search, and media asset management are shipped as separate modules, but there is still no single cross-modal search tool
- **Future visual/scene module:** natural-language search over video/frame-level content. Not implemented tonight and not claimed by current search tools
- **Remote/team transport** — SSE mode
- **True cache layer** distinct from the knowledge-base store

### Future 🔮
- Cross-modal transcript + comment + media retrieval
- Share of voice measurement
- Growth trajectory analysis
- Sponsored content detection
- CLI and browser UI surfaces

## Fresh-start verification path (delete config, rebuild, reinstall)

1. Ensure deps are available:
   ```bash
   brew install yt-dlp
   node --version   # 20+
   ```
2. Build locally:
   ```bash
   cd /absolute/path/to/youtube-mcp
   npm install
   npm run build
   ```
3. Optional: remove Claude Desktop's MCP config if you want a genuine fresh start:
   ```bash
   rm -f ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
4. Run doctor first:
   ```bash
   node dist/cli.js doctor --no-live
   ```
5. Run setup:
   ```bash
   node dist/cli.js setup
   ```
   If you want keys persisted into Claude Desktop config at install time:
   ```bash
   node dist/cli.js setup --youtube-api-key "your_key_here" --gemini-api-key "your_gemini_key_here"
   ```
6. Fully quit and reopen Claude Desktop.
7. In Claude, try this exact V2.16 sanity path:
   - "Run checkSystemHealth" (should show runtime version, detected clients, key status)
   - "Run checkImportReadiness for <video-url>"
   - "Build a video dossier for <video-url>"
   - "Import this playlist: <playlist-url>" (uses local embeddings by default and makes it the active collection)
   - "Search my imported transcripts for prioritization frameworks" (should stay scoped to the active collection)
   - "List my transcript collections" (shows active collection + embedding provider)
   - "Clear the active collection, then search my imported transcripts for prioritization frameworks" (fans back out across all collections)

**ChatGPT Desktop / Ultra tonight:** run `node dist/cli.js setup --print-only` or `node dist/cli.js setup --client chatgpt_desktop --print-only` to get the exact generated MCP entry, then paste it manually into ChatGPT Desktop if the MCP UI/JSON surface is available on your machine.

## Development

```bash
git clone https://github.com/rajanrengasamy/youtube-mcp.git
cd youtube-mcp
npm install
npm run build
npm test
npm run smoke:dry   # all tools including knowledge-base flow, dry mode, temp data dir
npm start           # start MCP server (stdio)
```

## How is this built?

TypeScript, [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk), built-in `node:sqlite`, and [`yt-dlp`](https://github.com/yt-dlp/yt-dlp).

No external database. No API-key dependency for the default knowledge-base flow. Optional Gemini API key unlocks dense embedding search via `gemini-embedding-2-preview`.

The architecture follows the [OpenClaw](https://github.com/openclaw/openclaw) workspace convention for AI-native development.

## License

MIT

---

<p align="center">
  <strong>Built by <a href="https://github.com/rajanrengasamy">Rajan Rengasamy</a></strong>
  <br/>
  <sub>If this saves you time, a ⭐ on the repo helps others find it.</sub>
</p>
