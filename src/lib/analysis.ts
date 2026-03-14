import type { Chapter, CommentRecord, ContentGap, NicheMomentum, NicheSaturation, TranscriptRecord, TranscriptSegment, TrendingVideo, VideoRecord } from "./types.js";

const POSITIVE_WORDS = new Set([
  "amazing",
  "awesome",
  "best",
  "clear",
  "excellent",
  "fantastic",
  "good",
  "great",
  "helpful",
  "impressive",
  "informative",
  "love",
  "perfect",
  "solid",
  "useful",
  "valuable",
  "win",
]);

const NEGATIVE_WORDS = new Set([
  "awful",
  "bad",
  "boring",
  "confusing",
  "clickbait",
  "disappointing",
  "hate",
  "issue",
  "misleading",
  "poor",
  "terrible",
  "unhelpful",
  "useless",
  "waste",
  "wrong",
]);

const RISK_PATTERNS = [
  { signal: "Confusion or unclear explanation", tokens: ["confusing", "unclear", "lost", "hard to follow"] },
  { signal: "Clickbait or expectation mismatch", tokens: ["clickbait", "misleading", "bait", "not what"] },
  { signal: "Audio or production complaints", tokens: ["audio", "mic", "volume", "loud", "quiet"] },
  { signal: "Pacing complaints", tokens: ["slow", "dragging", "too fast", "rushed"] },
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "that",
  "this",
  "with",
  "from",
  "your",
  "have",
  "about",
  "into",
  "there",
  "their",
  "will",
  "what",
  "when",
  "where",
  "which",
  "while",
  "then",
  "than",
  "them",
  "they",
  "just",
  "really",
  "very",
  "much",
  "more",
  "most",
  "some",
  "because",
  "would",
  "could",
  "should",
  "been",
  "were",
  "make",
  "made",
  "into",
  "video",
  "youtube",
]);

export interface SentimentSummary {
  positivePct: number;
  neutralPct: number;
  negativePct: number;
  sentimentScore: number;
}

export interface ThemeScore {
  theme: string;
  prevalencePct: number;
  sentimentScore: number;
}

export interface RiskSignal {
  signal: string;
  severity: "low" | "medium" | "high";
  frequencyPct: number;
}

export interface QuoteSample {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface HookPatternResult {
  hookScore: number;
  hookType: "question" | "promise" | "shock" | "story" | "proof" | "other";
  first30SecSummary: string;
  weakSignals: string[];
  improvements: string[];
}

export function median(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return round(sorted[middle]);
}

export function percentile(values: number[], ratio: number): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return round(sorted[index]);
}

export function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function inferVideoFormat(durationSec?: number): "short" | "long" | "unknown" {
  if (!durationSec || durationSec <= 0) {
    return "unknown";
  }
  return durationSec <= 60 ? "short" : "long";
}

export function computeEngagementRate(video: Pick<VideoRecord, "views" | "likes" | "comments">): number | undefined {
  if (!video.views || video.views <= 0) {
    return undefined;
  }
  const likes = video.likes ?? 0;
  const comments = video.comments ?? 0;
  return round(((likes + comments) / video.views) * 100, 2);
}

export function computeCommentRate(video: Pick<VideoRecord, "views" | "comments">): number | undefined {
  if (!video.views || video.views <= 0 || video.comments === undefined) {
    return undefined;
  }
  return round((video.comments / video.views) * 100, 2);
}

export function computeLikeRate(video: Pick<VideoRecord, "views" | "likes">): number | undefined {
  if (!video.views || video.views <= 0 || video.likes === undefined) {
    return undefined;
  }
  return round((video.likes / video.views) * 100, 2);
}

export function computeViewVelocity24h(views: number | undefined, publishedAt?: string): number | undefined {
  if (!views || !publishedAt) {
    return undefined;
  }
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) {
    return undefined;
  }
  const hours = Math.max((Date.now() - published) / 3_600_000, 1);
  return Math.round((views / hours) * 24);
}

export function summarizeText(text: string, maxSentences = 2): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length === 0) {
    return cleaned.slice(0, 240);
  }
  return sentences.slice(0, maxSentences).join(" ").slice(0, 280);
}

export function parseDescriptionChapters(description?: string): Chapter[] {
  if (!description) {
    return [];
  }

  const chapterLines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
      if (!match) {
        return null;
      }
      return {
        tStartSec: parseHumanTimestamp(match[1]),
        title: match[2].trim(),
      };
    })
    .filter((value): value is { tStartSec: number; title: string } => Boolean(value));

  return chapterLines.map((chapter, index) => ({
    title: chapter.title,
    tStartSec: chapter.tStartSec,
    tEndSec: chapterLines[index + 1]?.tStartSec,
  }));
}

export function buildTranscriptSegmentsForWindow(
  transcript: TranscriptRecord,
  windowSec: number,
  maxSegments = 6,
): TranscriptSegment[] {
  if (transcript.segments.length === 0) {
    return [];
  }

  const grouped: TranscriptSegment[] = [];
  let bucket: TranscriptSegment[] = [];
  let bucketStart = transcript.segments[0]?.tStartSec ?? 0;

  for (const segment of transcript.segments) {
    const start = segment.tStartSec;
    if (bucket.length > 0 && start - bucketStart >= windowSec) {
      grouped.push(collapseSegments(bucket));
      bucket = [];
      bucketStart = start;
    }
    bucket.push(segment);
  }

  if (bucket.length > 0) {
    grouped.push(collapseSegments(bucket));
  }

  return grouped.slice(0, maxSegments).map((segment) => ({
    ...segment,
    topicLabel: summarizeText(segment.text, 1),
  }));
}

export function buildChapterTranscriptSegments(transcript: TranscriptRecord): TranscriptSegment[] {
  const chapters = transcript.chapters ?? [];
  if (chapters.length === 0) {
    return buildTranscriptSegmentsForWindow(transcript, 180, 8);
  }

  return chapters.map((chapter) => {
    const chapterSegments = transcript.segments.filter((segment) => {
      const segmentEnd = segment.tEndSec ?? segment.tStartSec;
      const chapterEnd = chapter.tEndSec ?? Number.POSITIVE_INFINITY;
      return segment.tStartSec < chapterEnd && segmentEnd >= chapter.tStartSec;
    });

    const merged = collapseSegments(chapterSegments.length > 0 ? chapterSegments : transcript.segments.slice(0, 1));
    return {
      ...merged,
      chapterTitle: chapter.title,
      topicLabel: chapter.title,
      tStartSec: chapter.tStartSec,
      tEndSec: chapter.tEndSec,
    };
  });
}

export function analyzeComments(comments: CommentRecord[], includeThemes = true, includeQuotes = true): {
  sentiment: SentimentSummary;
  themes?: ThemeScore[];
  riskSignals: RiskSignal[];
  representativeQuotes?: QuoteSample[];
} {
  const sentimentBuckets = { positive: 0, neutral: 0, negative: 0 };
  const themeBuckets = new Map<string, { count: number; sentimentTotal: number }>();
  const representativeQuotes: QuoteSample[] = [];

  for (const comment of comments) {
    const sentiment = classifySentiment(comment.text);
    sentimentBuckets[sentiment.label] += 1;

    if (includeThemes) {
      for (const theme of extractThemes(comment.text)) {
        const current = themeBuckets.get(theme) ?? { count: 0, sentimentTotal: 0 };
        current.count += 1;
        current.sentimentTotal += sentiment.score;
        themeBuckets.set(theme, current);
      }
    }

    if (includeQuotes && representativeQuotes.length < 6 && comment.text.length > 20) {
      representativeQuotes.push({
        text: comment.text.slice(0, 220),
        sentiment: sentiment.label,
      });
    }
  }

  const total = comments.length || 1;
  const summary: SentimentSummary = {
    positivePct: round((sentimentBuckets.positive / total) * 100, 1),
    neutralPct: round((sentimentBuckets.neutral / total) * 100, 1),
    negativePct: round((sentimentBuckets.negative / total) * 100, 1),
    sentimentScore: round(((sentimentBuckets.positive - sentimentBuckets.negative) / total) * 100, 1),
  };

  const themes = includeThemes
    ? Array.from(themeBuckets.entries())
        .map(([theme, value]) => ({
          theme,
          prevalencePct: round((value.count / total) * 100, 1),
          sentimentScore: round((value.sentimentTotal / value.count) * 100, 1),
        }))
        .sort((a, b) => b.prevalencePct - a.prevalencePct)
        .slice(0, 6)
    : undefined;

  return {
    sentiment: summary,
    themes,
    riskSignals: analyzeRiskSignals(comments.map((comment) => comment.text)),
    representativeQuotes: includeQuotes ? representativeQuotes.slice(0, 5) : undefined,
  };
}

export function scoreHookPattern(videoId: string, transcript: TranscriptRecord, hookWindowSec = 30): HookPatternResult {
  const firstWindow = transcript.segments.filter((segment) => segment.tStartSec <= hookWindowSec);
  const text = firstWindow.map((segment) => segment.text).join(" ").trim() || transcript.transcriptText.slice(0, 500);
  const summary = summarizeText(text, 2);
  const lower = text.toLowerCase();

  let hookType: HookPatternResult["hookType"] = "other";
  let score = 40;
  const weakSignals: string[] = [];
  const improvements: string[] = [];

  if (lower.includes("?")) {
    hookType = "question";
    score += 14;
  }
  if (/(how to|i'll show|we're going to|today you'll learn|by the end)/.test(lower)) {
    hookType = hookType === "other" ? "promise" : hookType;
    score += 18;
  }
  if (/(story|when i|last week|once|years ago)/.test(lower)) {
    hookType = hookType === "other" ? "story" : hookType;
    score += 12;
  }
  if (/(proof|results|tested|data|case study|examples)/.test(lower)) {
    hookType = hookType === "other" ? "proof" : hookType;
    score += 12;
  }
  if (/(crazy|shocking|nobody tells you|mistake|secret|warning)/.test(lower)) {
    hookType = "shock";
    score += 10;
  }
  if (/\d/.test(lower)) {
    score += 6;
  }
  if (text.length < 80) {
    weakSignals.push("The opening is very short and may not frame the payoff clearly.");
    improvements.push("State the promise, result, or problem in the first 1-2 sentences.");
    score -= 8;
  }
  if (!/[?!.]/.test(text)) {
    weakSignals.push("Low rhetorical energy in the opening copy.");
    improvements.push("Use a sharper question, claim, or proof point to create tension.");
    score -= 6;
  }
  if (!(lower.includes("you") || lower.includes("your"))) {
    weakSignals.push("Limited audience-facing framing.");
    improvements.push("Address the viewer directly so the hook feels relevant.");
    score -= 4;
  }

  score = Math.max(0, Math.min(100, score));

  if (improvements.length === 0) {
    improvements.push("Keep the opening tight and move into proof quickly.");
  }
  if (weakSignals.length === 0) {
    weakSignals.push("No major hook weakness detected from transcript alone.");
  }

  return {
    hookScore: score,
    hookType,
    first30SecSummary: summary || `Opening transcript unavailable for ${videoId}`,
    weakSignals,
    improvements,
  };
}

export function extractRecurringKeywords(videos: VideoRecord[], limit = 8): string[] {
  const counts = new Map<string, number>();

  for (const video of videos) {
    const source = `${video.title} ${(video.tags ?? []).join(" ")}`.toLowerCase();
    for (const token of tokenize(source)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function titleStructure(title: string): string {
  const lower = title.toLowerCase();
  const flags = [] as string[];
  if (/\d/.test(title)) flags.push("number");
  if (title.includes(":")) flags.push("colon");
  if (title.includes("|")) flags.push("pipe");
  if (title.includes("?")) flags.push("question");
  if (/^(how|why|what|when)\b/.test(lower)) flags.push("how_why_what");
  if (/(guide|tutorial|explained|review|mistakes|tips)/.test(lower)) flags.push("format_keyword");
  if (/(you|your)\b/.test(lower)) flags.push("viewer_addressed");
  return flags.length > 0 ? flags.join("+") : "plain_statement";
}

function collapseSegments(segments: TranscriptSegment[]): TranscriptSegment {
  const text = segments.map((segment) => segment.text).join(" ").replace(/\s+/g, " ").trim();
  return {
    tStartSec: segments[0]?.tStartSec ?? 0,
    tEndSec: segments[segments.length - 1]?.tEndSec,
    text,
  };
}

function parseHumanTimestamp(value: string): number {
  const parts = value.split(":").map((part) => Number(part));
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function analyzeRiskSignals(samples: string[]): RiskSignal[] {
  const total = samples.length || 1;
  const signals = RISK_PATTERNS.map((pattern) => {
    const matches = samples.filter((sample) => pattern.tokens.some((token) => sample.toLowerCase().includes(token))).length;
    const frequencyPct = round((matches / total) * 100, 1);
    return {
      signal: pattern.signal,
      frequencyPct,
      severity: frequencyPct >= 20 ? "high" : frequencyPct >= 8 ? "medium" : "low",
    } satisfies RiskSignal;
  }).filter((item) => item.frequencyPct > 0);

  return signals.slice(0, 4);
}

function classifySentiment(text: string): { label: "positive" | "neutral" | "negative"; score: number } {
  const tokens = tokenize(text);
  let positive = 0;
  let negative = 0;

  for (const token of tokens) {
    if (POSITIVE_WORDS.has(token)) positive += 1;
    if (NEGATIVE_WORDS.has(token)) negative += 1;
  }

  if (positive === 0 && negative === 0) {
    return { label: "neutral", score: 0 };
  }

  const score = (positive - negative) / Math.max(positive + negative, 1);
  if (score > 0.2) {
    return { label: "positive", score };
  }
  if (score < -0.2) {
    return { label: "negative", score };
  }
  return { label: "neutral", score };
}

function extractThemes(text: string): string[] {
  const tokens = tokenize(text).filter((token) => token.length >= 4);
  const unique = new Set(tokens.slice(0, 8));
  return Array.from(unique).slice(0, 3);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// ─── Trends & Discovery Analysis ────────────────────────────────────

/**
 * Compute momentum indicator by comparing recent videos vs older videos.
 * Splits the video set by median publish date and compares median views.
 */
export function computeNicheMomentum(
  videos: TrendingVideo[],
  lookbackDays: number,
): NicheMomentum {
  const withDates = videos
    .filter((v) => v.publishedAt)
    .map((v) => ({
      ...v,
      publishTs: new Date(v.publishedAt!).getTime(),
    }))
    .filter((v) => !Number.isNaN(v.publishTs))
    .sort((a, b) => b.publishTs - a.publishTs);

  if (withDates.length < 4) {
    return {
      medianViews: median(videos.map((v) => v.views ?? 0).filter((v) => v > 0)),
      medianEngagementRate: median(
        videos.map((v) => v.engagementRate ?? 0).filter((v) => v > 0),
      ),
      recencyBias: "insufficient_data",
      explanation: `Only ${withDates.length} dated videos found — not enough to assess momentum reliably.`,
    };
  }

  const midpoint = Math.floor(withDates.length / 2);
  const recent = withDates.slice(0, midpoint);
  const older = withDates.slice(midpoint);

  const recentMedianViews = median(recent.map((v) => v.views ?? 0)) ?? 0;
  const olderMedianViews = median(older.map((v) => v.views ?? 0)) ?? 1;

  const ratio = olderMedianViews > 0 ? round(recentMedianViews / olderMedianViews, 2) : undefined;

  let recencyBias: NicheMomentum["recencyBias"];
  let explanation: string;

  if (ratio === undefined) {
    recencyBias = "insufficient_data";
    explanation = "Cannot compute momentum — older half has zero median views.";
  } else if (ratio >= 1.3) {
    recencyBias = "accelerating";
    explanation = `Recent videos outperform older ones by ${round((ratio - 1) * 100, 0)}%. This niche appears to have growing viewer interest.`;
  } else if (ratio >= 0.8) {
    recencyBias = "steady";
    explanation = `Recent and older video performance are within 20% of each other. The niche has stable, consistent audience demand.`;
  } else {
    recencyBias = "decelerating";
    explanation = `Older videos significantly outperform recent ones (ratio ${ratio}). This niche may be cooling or saturated.`;
  }

  return {
    medianViews: median(videos.map((v) => v.views ?? 0).filter((v) => v > 0)),
    medianEngagementRate: median(
      videos.map((v) => v.engagementRate ?? 0).filter((v) => v > 0),
    ),
    recentVsOlderViewRatio: ratio,
    recencyBias,
    explanation,
  };
}

/**
 * Estimate niche saturation from the view distribution of search results.
 */
export function computeNicheSaturation(
  videos: TrendingVideo[],
): NicheSaturation {
  const views = videos.map((v) => v.views ?? 0).filter((v) => v > 0);

  if (views.length < 3) {
    return {
      totalResultsSampled: videos.length,
      saturationLevel: "insufficient_data",
      explanation: "Too few videos with view data to assess saturation.",
    };
  }

  const med = median(views) ?? 0;
  const top25 = percentile(views, 0.75) ?? 0;
  const bottom25 = percentile(views, 0.25) ?? 0;

  // Concentration ratio: how much of the view share is captured by top performers
  const totalViews = views.reduce((a, b) => a + b, 0);
  const sorted = [...views].sort((a, b) => b - a);
  const topThird = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 3)));
  const topThirdViews = topThird.reduce((a, b) => a + b, 0);
  const concentrationRatio = totalViews > 0 ? round(topThirdViews / totalViews, 2) : 0;

  let saturationLevel: NicheSaturation["saturationLevel"];
  let explanation: string;

  if (concentrationRatio >= 0.85) {
    saturationLevel = "high";
    explanation = `Top third of videos capture ${round(concentrationRatio * 100, 0)}% of total views. Few creators dominate — a new entrant needs strong differentiation to break through.`;
  } else if (concentrationRatio >= 0.65) {
    saturationLevel = "medium";
    explanation = `Moderate view concentration (${round(concentrationRatio * 100, 0)}% in top third). Some established players, but room for new creators with quality content.`;
  } else {
    saturationLevel = "low";
    explanation = `Views are spread relatively evenly across results (${round(concentrationRatio * 100, 0)}% in top third). This looks like an open or emerging niche.`;
  }

  return {
    totalResultsSampled: videos.length,
    medianViews: med,
    topQuartileViews: top25,
    bottomQuartileViews: bottom25,
    saturationLevel,
    explanation,
  };
}

/**
 * Detect content gap angles from title/tag patterns. Heuristic:
 * look for under-represented sub-topics and format gaps.
 */
export function detectContentGaps(
  videos: TrendingVideo[],
  niche: string,
): ContentGap[] {
  const gaps: ContentGap[] = [];
  const titles = videos.map((v) => v.title.toLowerCase());
  const allTags = videos.flatMap((v) => v.tags ?? []).map((t) => t.toLowerCase());

  // Format gap: if mostly long-form, shorts are a gap and vice versa
  const shorts = videos.filter((v) => v.format === "short");
  const longForm = videos.filter((v) => v.format === "long");
  const shortsPct = videos.length > 0 ? (shorts.length / videos.length) * 100 : 0;
  const longPct = videos.length > 0 ? (longForm.length / videos.length) * 100 : 0;

  if (shortsPct < 15 && longForm.length >= 3) {
    gaps.push({
      angle: "Shorts format under-represented",
      evidence: `Only ${round(shortsPct, 0)}% of top results are Shorts. Repurposing key insights from long-form ${niche} content into Shorts could capture mobile/discovery traffic.`,
      opportunityScore: 70,
    });
  }

  if (longPct < 20 && shorts.length >= 3) {
    gaps.push({
      angle: "Long-form deep-dives under-represented",
      evidence: `Only ${round(longPct, 0)}% of top results are long-form. Detailed tutorials or analyses on ${niche} could differentiate in a Shorts-heavy landscape.`,
      opportunityScore: 65,
    });
  }

  // Tutorial/how-to gap
  const tutorialCount = titles.filter((t) =>
    /(how to|tutorial|step by step|guide|beginner|learn|explained)/.test(t),
  ).length;
  if (tutorialCount < videos.length * 0.2 && videos.length >= 5) {
    gaps.push({
      angle: "Educational / how-to content gap",
      evidence: `Only ${tutorialCount} of ${videos.length} top results are tutorials or explainers. Educational content for "${niche}" beginners could fill a gap.`,
      opportunityScore: 60,
    });
  }

  // Comparison / vs content
  const comparisonCount = titles.filter((t) =>
    /(vs\b|versus|compared|comparison|better|alternative)/.test(t),
  ).length;
  if (comparisonCount < 2 && videos.length >= 8) {
    gaps.push({
      angle: "Comparison / versus content gap",
      evidence: `Few comparison videos found in top results. Head-to-head or "X vs Y" content in ${niche} could attract decision-stage viewers.`,
      opportunityScore: 55,
    });
  }

  // Data / proof-based content
  const dataCount = titles.filter((t) =>
    /(data|research|study|tested|experiment|results|proof|case study)/.test(t),
  ).length;
  if (dataCount < 2 && videos.length >= 8) {
    gaps.push({
      angle: "Data-driven / proof-based content gap",
      evidence: `Very few results lead with data or experiments. Evidence-based ${niche} content could stand out against opinion-heavy coverage.`,
      opportunityScore: 55,
    });
  }

  // Sort by opportunity score, cap at 5
  return gaps.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
}

/**
 * Compute format breakdown percentages.
 */
export function computeFormatBreakdown(
  videos: TrendingVideo[],
): { shortsPct: number; longFormPct: number; unknownPct: number } {
  const total = videos.length || 1;
  const shorts = videos.filter((v) => v.format === "short").length;
  const long = videos.filter((v) => v.format === "long").length;
  const unknown = videos.filter((v) => v.format === "unknown").length;
  return {
    shortsPct: round((shorts / total) * 100, 1),
    longFormPct: round((long / total) * 100, 1),
    unknownPct: round((unknown / total) * 100, 1),
  };
}
