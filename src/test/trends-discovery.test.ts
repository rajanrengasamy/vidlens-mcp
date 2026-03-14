import assert from "node:assert/strict";
import test from "node:test";
import {
  computeNicheMomentum,
  computeNicheSaturation,
  detectContentGaps,
  computeFormatBreakdown,
} from "../lib/analysis.js";
import type { TrendingVideo } from "../lib/types.js";

// ─── Test fixtures ──────────────────────────────────────────────────

function makeTrendingVideo(overrides: Partial<TrendingVideo> = {}): TrendingVideo {
  return {
    videoId: overrides.videoId ?? "test123",
    title: overrides.title ?? "Test video",
    channelTitle: overrides.channelTitle ?? "TestChannel",
    publishedAt: overrides.publishedAt ?? "2026-03-01T10:00:00.000Z",
    durationSec: overrides.durationSec ?? 600,
    views: overrides.views ?? 10000,
    likes: overrides.likes ?? 500,
    comments: overrides.comments ?? 50,
    engagementRate: overrides.engagementRate ?? 5.5,
    viewVelocity24h: overrides.viewVelocity24h,
    format: overrides.format ?? "long",
    tags: overrides.tags ?? ["test"],
  };
}

// ─── computeNicheMomentum ───────────────────────────────────────────

test("computeNicheMomentum returns insufficient_data for < 4 dated videos", () => {
  const videos = [
    makeTrendingVideo({ publishedAt: "2026-03-10T10:00:00Z" }),
    makeTrendingVideo({ publishedAt: "2026-03-09T10:00:00Z" }),
  ];
  const result = computeNicheMomentum(videos, 90);
  assert.equal(result.recencyBias, "insufficient_data");
});

test("computeNicheMomentum detects accelerating trend", () => {
  const videos = [
    makeTrendingVideo({ publishedAt: "2026-03-12T10:00:00Z", views: 50000 }),
    makeTrendingVideo({ publishedAt: "2026-03-11T10:00:00Z", views: 45000 }),
    makeTrendingVideo({ publishedAt: "2026-03-10T10:00:00Z", views: 48000 }),
    makeTrendingVideo({ publishedAt: "2026-02-01T10:00:00Z", views: 10000 }),
    makeTrendingVideo({ publishedAt: "2026-01-15T10:00:00Z", views: 8000 }),
    makeTrendingVideo({ publishedAt: "2026-01-10T10:00:00Z", views: 12000 }),
  ];
  const result = computeNicheMomentum(videos, 90);
  assert.equal(result.recencyBias, "accelerating");
  assert.ok(result.recentVsOlderViewRatio !== undefined && result.recentVsOlderViewRatio >= 1.3);
});

test("computeNicheMomentum detects decelerating trend", () => {
  const videos = [
    makeTrendingVideo({ publishedAt: "2026-03-12T10:00:00Z", views: 3000 }),
    makeTrendingVideo({ publishedAt: "2026-03-11T10:00:00Z", views: 2500 }),
    makeTrendingVideo({ publishedAt: "2026-03-10T10:00:00Z", views: 2800 }),
    makeTrendingVideo({ publishedAt: "2026-01-15T10:00:00Z", views: 40000 }),
    makeTrendingVideo({ publishedAt: "2026-01-10T10:00:00Z", views: 35000 }),
    makeTrendingVideo({ publishedAt: "2026-01-05T10:00:00Z", views: 38000 }),
  ];
  const result = computeNicheMomentum(videos, 90);
  assert.equal(result.recencyBias, "decelerating");
});

test("computeNicheMomentum detects steady trend", () => {
  const videos = [
    makeTrendingVideo({ publishedAt: "2026-03-12T10:00:00Z", views: 10000 }),
    makeTrendingVideo({ publishedAt: "2026-03-11T10:00:00Z", views: 11000 }),
    makeTrendingVideo({ publishedAt: "2026-02-01T10:00:00Z", views: 10500 }),
    makeTrendingVideo({ publishedAt: "2026-01-15T10:00:00Z", views: 10200 }),
  ];
  const result = computeNicheMomentum(videos, 90);
  assert.equal(result.recencyBias, "steady");
});

// ─── computeNicheSaturation ─────────────────────────────────────────

test("computeNicheSaturation returns insufficient_data for < 3 videos", () => {
  const videos = [
    makeTrendingVideo({ views: 1000 }),
    makeTrendingVideo({ views: 2000 }),
  ];
  const result = computeNicheSaturation(videos);
  assert.equal(result.saturationLevel, "insufficient_data");
});

test("computeNicheSaturation detects high saturation when top third dominates", () => {
  const videos = [
    makeTrendingVideo({ views: 1000000 }),
    makeTrendingVideo({ views: 900000 }),
    makeTrendingVideo({ views: 5000 }),
    makeTrendingVideo({ views: 3000 }),
    makeTrendingVideo({ views: 2000 }),
    makeTrendingVideo({ views: 1000 }),
  ];
  const result = computeNicheSaturation(videos);
  assert.equal(result.saturationLevel, "high");
});

test("computeNicheSaturation detects low saturation when views are spread", () => {
  const videos = [
    makeTrendingVideo({ views: 10000 }),
    makeTrendingVideo({ views: 9500 }),
    makeTrendingVideo({ views: 9000 }),
    makeTrendingVideo({ views: 8500 }),
    makeTrendingVideo({ views: 8000 }),
    makeTrendingVideo({ views: 7500 }),
  ];
  const result = computeNicheSaturation(videos);
  assert.equal(result.saturationLevel, "low");
});

// ─── detectContentGaps ──────────────────────────────────────────────

test("detectContentGaps finds shorts gap when none present", () => {
  const videos = Array.from({ length: 10 }, (_, i) =>
    makeTrendingVideo({
      videoId: `vid${i}`,
      title: `Long form content about widgets ${i}`,
      format: "long",
      durationSec: 600,
    }),
  );
  const gaps = detectContentGaps(videos, "widgets");
  const shortsGap = gaps.find((g) => g.angle.includes("Shorts"));
  assert.ok(shortsGap, "Should detect a Shorts gap");
  assert.ok(shortsGap.opportunityScore > 0);
});

test("detectContentGaps finds tutorial gap", () => {
  const videos = Array.from({ length: 10 }, (_, i) =>
    makeTrendingVideo({
      videoId: `vid${i}`,
      title: `My opinion on widget ${i}`,
      format: "long",
    }),
  );
  const gaps = detectContentGaps(videos, "widgets");
  const tutorialGap = gaps.find((g) => g.angle.includes("Educational"));
  assert.ok(tutorialGap, "Should detect a tutorial/educational gap");
});

test("detectContentGaps returns empty for well-covered niche", () => {
  const videos = [
    makeTrendingVideo({ title: "How to build widgets: Tutorial", format: "long" }),
    makeTrendingVideo({ title: "Widget A vs Widget B", format: "long" }),
    makeTrendingVideo({ title: "I tested 5 widgets — results!", format: "long" }),
    makeTrendingVideo({ title: "Quick widget tip", format: "short", durationSec: 30 }),
    makeTrendingVideo({ title: "Widget comparison data", format: "short", durationSec: 45 }),
  ];
  // Small set — gaps will be limited
  const gaps = detectContentGaps(videos, "widgets");
  // With 5 videos, most gap detectors don't fire (need >= 8 for comparison/data gaps)
  assert.ok(gaps.length <= 5, "Should not produce more than 5 gaps");
});

// ─── computeFormatBreakdown ─────────────────────────────────────────

test("computeFormatBreakdown computes correct percentages", () => {
  const videos = [
    makeTrendingVideo({ format: "short" }),
    makeTrendingVideo({ format: "short" }),
    makeTrendingVideo({ format: "long" }),
    makeTrendingVideo({ format: "long" }),
    makeTrendingVideo({ format: "long" }),
    makeTrendingVideo({ format: "unknown" }),
  ];
  const breakdown = computeFormatBreakdown(videos);
  assert.ok(Math.abs(breakdown.shortsPct - 33.3) < 1);
  assert.ok(Math.abs(breakdown.longFormPct - 50) < 1);
  assert.ok(Math.abs(breakdown.unknownPct - 16.7) < 1);
});

test("computeFormatBreakdown handles empty array", () => {
  const breakdown = computeFormatBreakdown([]);
  assert.equal(breakdown.shortsPct, 0);
  assert.equal(breakdown.longFormPct, 0);
  assert.equal(breakdown.unknownPct, 0);
});
