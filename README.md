<p align="center">
  <img src="assets/logo.png" alt="VidLens" width="400" />
</p>

<p align="center">
  <strong>The YouTube intelligence layer for AI agents</strong><br/>
  <em>Zero config · 37 tools · Three-tier fallback · Actually works</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vidlens-mcp"><img src="https://img.shields.io/npm/v/vidlens-mcp?style=flat-square&color=red" alt="npm" /></a>
  <a href="https://github.com/rajanrengasamy/vidlens-mcp/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-compatible-green?style=flat-square" alt="MCP" /></a>
  <img src="https://img.shields.io/badge/tools-37-orange?style=flat-square" alt="37 tools" />
  <img src="https://img.shields.io/badge/zero--config-✓-brightgreen?style=flat-square" alt="Zero Config" />
</p>

---

## 🔍 What is VidLens?

VidLens is a [Model Context Protocol](https://modelcontextprotocol.io/) server that gives AI agents deep, reliable access to YouTube. Not just transcripts — full intelligence: sentiment analysis, trend discovery, semantic search, media assets, and creator analytics.

**No API key required to start.** Every tool has a three-tier fallback chain (YouTube API → yt-dlp → page extraction) so nothing breaks when quota runs out or keys aren't configured.

---

## ⚡ Why VidLens?

<table>
<tr><th></th><th>VidLens</th><th>Other YouTube MCP servers</th></tr>
<tr><td>🔑 <strong>Setup</strong></td><td>✅ Works immediately — no keys needed</td><td>❌ Most require YouTube API key upfront</td></tr>
<tr><td>🛡️ <strong>Reliability</strong></td><td>✅ Three-tier fallback on every tool</td><td>❌ Single point of failure — API down = broken</td></tr>
<tr><td>🧠 <strong>Intelligence</strong></td><td>✅ Sentiment, trends, content gaps, hooks</td><td>❌ Raw data dumps — you do the analysis</td></tr>
<tr><td>📦 <strong>Token efficiency</strong></td><td>✅ 75-87% smaller responses</td><td>❌ Verbose JSON with thumbnails, etags, junk</td></tr>
<tr><td>🔬 <strong>Depth</strong></td><td>✅ 37 tools across 8 modules</td><td>⚠️ 1-5 tools, mostly transcripts only</td></tr>
<tr><td>⚖️ <strong>Trademark</strong></td><td>✅ Compliant naming</td><td>⚠️ Most violate YouTube trademark</td></tr>
</table>

---

## 🚀 Quick Start

### 1. Install

```bash
npx vidlens-mcp setup
```

This auto-detects your MCP client (Claude Desktop, Cursor, etc.) and configures it.

### 2. Or configure manually

**Claude Desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vidlens-mcp": {
      "command": "npx",
      "args": ["-y", "vidlens-mcp", "serve"]
    }
  }
}
```

### 3. Restart your MCP client

Fully quit and reopen Claude Desktop (or your client). VidLens will appear in the tool list.

### 4. Try it

> "Get the transcript of this video: https://youtube.com/watch?v=dQw4w9WgXcQ"
>
> "Import this playlist and search for mentions of machine learning"
>
> "What's the audience sentiment on this video?"
>
> "What's trending in the AI coding niche right now?"

---

## 🧰 Tools — 37 across 8 modules

### 📺 Core — Video & Channel Intelligence
*Always available, no API key needed*

| Tool | What it does |
|---|---|
| `findVideos` | Search YouTube by query with metadata |
| `inspectVideo` | Deep metadata — tags, engagement, language, category |
| `inspectChannel` | Channel stats, description, recent uploads |
| `listChannelCatalog` | Browse a channel's full video library |
| `readTranscript` | Full transcript with timestamps and chapters |
| `readComments` | Top comments with likes and engagement |
| `expandPlaylist` | List all videos in any playlist |

### 🔎 Knowledge Base — Semantic Search
*Index transcripts and search across them with natural language*

| Tool | What it does |
|---|---|
| `importPlaylist` | Index an entire playlist's transcripts |
| `importVideos` | Index specific videos by URL/ID |
| `searchTranscripts` | Natural language search across indexed content |
| `listCollections` | Browse your indexed collections |
| `setActiveCollection` | Scope searches to one collection |
| `clearActiveCollection` | Search across all collections |
| `removeCollection` | Delete a collection and its index |

### 💬 Sentiment & Analysis
*Understand what audiences think and feel*

| Tool | What it does |
|---|---|
| `measureAudienceSentiment` | Comment sentiment with themes and risk signals |
| `analyzeVideoSet` | Compare performance across multiple videos |
| `analyzePlaylist` | Playlist-level engagement analytics |
| `buildVideoDossier` | Complete single-video deep analysis |

### 🎯 Creator Intelligence
*Insights for content strategy*

| Tool | What it does |
|---|---|
| `scoreHookPatterns` | Analyze what makes video openings work |
| `researchTagsAndTitles` | Tag and title optimization insights |
| `compareShortsVsLong` | Short-form vs long-form performance |
| `recommendUploadWindows` | Best times to publish for engagement |

### 📈 Discovery & Trends
*Find what's working in any niche*

| Tool | What it does |
|---|---|
| `discoverNicheTrends` | Momentum, saturation, content gaps in any topic |
| `exploreNicheCompetitors` | Channel landscape and top performers |

### 🎬 Media Assets
*Download and manage video files locally*

| Tool | What it does |
|---|---|
| `downloadAsset` | Download video, audio, or thumbnails |
| `listMediaAssets` | Browse stored media files |
| `removeMediaAsset` | Clean up downloaded assets |
| `extractKeyframes` | Extract key frames from videos |
| `mediaStoreHealth` | Storage usage and diagnostics |

### 💭 Comment Knowledge Base
*Index and semantically search YouTube comments*

| Tool | What it does |
|---|---|
| `importComments` | Index a video's comments for search |
| `searchComments` | Natural language search over comment corpus |
| `listCommentCollections` | Browse comment collections |
| `setActiveCommentCollection` | Scope comment searches |
| `clearActiveCommentCollection` | Search all comment collections |
| `removeCommentCollection` | Delete a comment collection |

### 🏥 Diagnostics
*Health checks and pre-flight validation*

| Tool | What it does |
|---|---|
| `checkSystemHealth` | Full system diagnostic report |
| `checkImportReadiness` | Validate before importing content |

---

## 🔑 API Keys (Optional)

VidLens works **without any API keys**. Add them to unlock more capabilities:

| Key | What it unlocks | Free? | How to get it |
|---|---|---|---|
| `YOUTUBE_API_KEY` | Better metadata, comment API, search via YouTube API | ✅ Free tier (10,000 units/day) | [Google Cloud Console](https://console.cloud.google.com/) → APIs → Enable YouTube Data API v3 → Credentials → Create API Key |
| `GEMINI_API_KEY` | Higher-quality embeddings for semantic search (768d vs 384d) | ✅ Free tier | [Google AI Studio](https://aistudio.google.com/) → Get API Key |

> ⚠️ **These are separate keys from separate Google services.** A Gemini key will NOT work for YouTube API calls and vice versa. Create them independently.

```bash
# Configure via setup wizard
npx vidlens-mcp setup --youtube-api-key YOUR_YOUTUBE_KEY --gemini-api-key YOUR_GEMINI_KEY

# Or via environment variables
export YOUTUBE_API_KEY=your_youtube_key
export GEMINI_API_KEY=your_gemini_key
```

---

## 💻 CLI

```bash
npx vidlens-mcp               # Start MCP server (stdio)
npx vidlens-mcp serve         # Start MCP server (explicit)
npx vidlens-mcp setup         # Auto-configure MCP clients
npx vidlens-mcp doctor        # Run diagnostics
npx vidlens-mcp version       # Print version
npx vidlens-mcp help          # Usage guide
```

### Doctor — diagnose issues

```bash
npx vidlens-mcp doctor --no-live
```

Checks: Node.js version, yt-dlp availability, API key validation, data directory health, MCP client detection (Claude Desktop, ChatGPT Desktop, Cursor, VS Code).

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│             MCP Client                  │
│   (Claude · Cursor · VS Code · etc.)   │
└──────────────────┬──────────────────────┘
                   │ stdio
┌──────────────────▼──────────────────────┐
│           VidLens MCP Server            │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         37 MCP Tools              │  │
│  │                                   │  │
│  │  📺 Core          🔎 Knowledge   │  │
│  │  💬 Sentiment     🎯 Creator     │  │
│  │  📈 Trends        🎬 Media       │  │
│  │  💭 Comments      🏥 Diagnostics │  │
│  └───────────────┬───────────────────┘  │
│                  │                       │
│  ┌───────────────▼───────────────────┐  │
│  │     Three-Tier Fallback Chain     │  │
│  │                                   │  │
│  │  1. YouTube Data API v3 (best)    │  │
│  │  2. yt-dlp (no key needed)        │  │
│  │  3. Page extraction (last resort) │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

Every tool attempts all three tiers. If the YouTube API is down or quota is exhausted, yt-dlp takes over seamlessly. If yt-dlp fails, page extraction provides a final safety net. **Your workflows never break.**

---

## 📋 Requirements

| Requirement | Status | Notes |
|---|---|---|
| **Node.js ≥ 20** | Required | `node --version` to check |
| **yt-dlp** | Recommended | `brew install yt-dlp` — enables zero-config mode |
| **ffmpeg** | Optional | Only needed for `extractKeyframes` tool |
| **YouTube API key** | Optional | Unlocks comments, better metadata |
| **Gemini API key** | Optional | Upgrades embedding quality |

---

## 🔧 Troubleshooting

### "Tool not found" in Claude Desktop
Fully quit Claude Desktop (⌘Q, not just close window) and reopen. MCP servers only load on startup.

### "YOUTUBE_API_KEY not configured" warning
This is informational, not an error. VidLens works without it. Add a key only if you need comments/sentiment features.

### "API_KEY_SERVICE_BLOCKED" error
Your API key has restrictions. Create a new **unrestricted** key in Google Cloud Console, or remove the API restriction from the existing key.

### Gemini key doesn't work for YouTube API
These are **separate services**. You need a YouTube API key from Google Cloud Console AND a Gemini key from Google AI Studio. They are not interchangeable.

### Build errors
```bash
npx vidlens-mcp doctor     # Run diagnostics
npx vidlens-mcp doctor --no-live  # Skip network checks
```

---

## 📄 License

MIT

---

<p align="center">
  <a href="https://github.com/rajanrengasamy/vidlens-mcp">GitHub</a> ·
  <a href="https://www.npmjs.com/package/vidlens-mcp">npm</a> ·
  <a href="https://modelcontextprotocol.io/">Model Context Protocol</a>
</p>
