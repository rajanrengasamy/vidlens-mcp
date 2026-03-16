import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Telemetry, type ToolCallMetric } from "../lib/telemetry.js";

function makeMetric(overrides: Partial<ToolCallMetric> = {}): ToolCallMetric {
  return {
    tool: "getVideoDetails",
    latencyMs: 100,
    fallbackDepth: 0,
    sourceTier: "youtube_api",
    success: true,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("Telemetry", () => {
  let telemetry: Telemetry;

  beforeEach(() => {
    telemetry = new Telemetry();
  });

  // 1. Fresh telemetry has zero counts and 0 rates
  it("fresh telemetry has zero counts and 0 rates", () => {
    const s = telemetry.summary();
    assert.equal(s.totalCalls, 0);
    assert.equal(s.successRate, 0);
    assert.equal(s.errorRate, 0);
    assert.equal(s.cacheHitRate, 0);
    assert.equal(s.avgLatencyMs, 0);
    assert.equal(s.p50LatencyMs, 0);
    assert.equal(s.p95LatencyMs, 0);
    assert.equal(s.p99LatencyMs, 0);
    assert.equal(s.avgFallbackDepth, 0);
    assert.deepEqual(s.tierDistribution, {});
    assert.deepEqual(s.topTools, []);
    assert.deepEqual(s.errorBreakdown, {});
    assert.deepEqual(s.recentErrors, []);
    assert.equal(telemetry.count(), 0);
  });

  // 2. Record a successful call — summary reflects it
  it("record a successful call — summary reflects it", () => {
    telemetry.record(makeMetric({ latencyMs: 50, sourceTier: "youtube_api" }));

    const s = telemetry.summary();
    assert.equal(s.totalCalls, 1);
    assert.equal(s.successRate, 1);
    assert.equal(s.errorRate, 0);
    assert.equal(s.avgLatencyMs, 50);
    assert.equal(s.tierDistribution["youtube_api"]?.count, 1);
    assert.equal(s.tierDistribution["youtube_api"]?.pct, 1);
    assert.equal(s.topTools.length, 1);
    assert.equal(s.topTools[0].tool, "getVideoDetails");
    assert.equal(s.topTools[0].calls, 1);
  });

  // 3. Record multiple calls — avgLatencyMs is correct
  it("record multiple calls — avgLatencyMs is correct", () => {
    telemetry.record(makeMetric({ latencyMs: 100 }));
    telemetry.record(makeMetric({ latencyMs: 200 }));
    telemetry.record(makeMetric({ latencyMs: 300 }));

    const s = telemetry.summary();
    assert.equal(s.totalCalls, 3);
    assert.equal(s.avgLatencyMs, 200);
  });

  // 4. successRate and errorRate computed correctly
  it("successRate and errorRate computed correctly", () => {
    telemetry.record(makeMetric({ success: true }));
    telemetry.record(makeMetric({ success: true }));
    telemetry.record(makeMetric({ success: false, errorCode: "QUOTA_EXCEEDED" }));
    telemetry.record(makeMetric({ success: false, errorCode: "NETWORK_ERROR" }));

    const s = telemetry.summary();
    assert.equal(s.successRate, 0.5);
    assert.equal(s.errorRate, 0.5);
  });

  // 5. p50/p95/p99 latency percentiles are correct (use known values)
  it("p50/p95/p99 latency percentiles are correct", () => {
    // Insert 100 metrics with latencies 1..100
    for (let i = 1; i <= 100; i++) {
      telemetry.record(makeMetric({ latencyMs: i }));
    }

    const s = telemetry.summary();
    assert.equal(s.p50LatencyMs, 50);
    assert.equal(s.p95LatencyMs, 95);
    assert.equal(s.p99LatencyMs, 99);
  });

  // 6. tierDistribution groups correctly
  it("tierDistribution groups correctly", () => {
    telemetry.record(makeMetric({ sourceTier: "youtube_api" }));
    telemetry.record(makeMetric({ sourceTier: "youtube_api" }));
    telemetry.record(makeMetric({ sourceTier: "yt_dlp" }));
    telemetry.record(makeMetric({ sourceTier: "page_extract" }));

    const s = telemetry.summary();
    assert.equal(s.tierDistribution["youtube_api"]?.count, 2);
    assert.equal(s.tierDistribution["youtube_api"]?.pct, 0.5);
    assert.equal(s.tierDistribution["yt_dlp"]?.count, 1);
    assert.equal(s.tierDistribution["yt_dlp"]?.pct, 0.25);
    assert.equal(s.tierDistribution["page_extract"]?.count, 1);
    assert.equal(s.tierDistribution["page_extract"]?.pct, 0.25);
  });

  // 7. topTools returns sorted by call count
  it("topTools returns sorted by call count", () => {
    // toolA: 5 calls, toolB: 3 calls, toolC: 1 call
    for (let i = 0; i < 5; i++) telemetry.record(makeMetric({ tool: "toolA" }));
    for (let i = 0; i < 3; i++) telemetry.record(makeMetric({ tool: "toolB" }));
    telemetry.record(makeMetric({ tool: "toolC" }));

    const s = telemetry.summary();
    assert.equal(s.topTools.length, 3);
    assert.equal(s.topTools[0].tool, "toolA");
    assert.equal(s.topTools[0].calls, 5);
    assert.equal(s.topTools[1].tool, "toolB");
    assert.equal(s.topTools[1].calls, 3);
    assert.equal(s.topTools[2].tool, "toolC");
    assert.equal(s.topTools[2].calls, 1);
  });

  // 8. errorBreakdown counts by code
  it("errorBreakdown counts by code", () => {
    telemetry.record(makeMetric({ success: false, errorCode: "QUOTA_EXCEEDED" }));
    telemetry.record(makeMetric({ success: false, errorCode: "QUOTA_EXCEEDED" }));
    telemetry.record(makeMetric({ success: false, errorCode: "NETWORK_ERROR" }));
    telemetry.record(makeMetric({ success: true }));

    const s = telemetry.summary();
    assert.equal(s.errorBreakdown["QUOTA_EXCEEDED"], 2);
    assert.equal(s.errorBreakdown["NETWORK_ERROR"], 1);
    assert.equal(Object.keys(s.errorBreakdown).length, 2);
  });

  // 9. recentErrors keeps only last 20
  it("recentErrors keeps only last 20", () => {
    for (let i = 0; i < 30; i++) {
      telemetry.record(
        makeMetric({
          success: false,
          errorCode: `ERR_${i}`,
          timestamp: 1000 + i,
        })
      );
    }

    const s = telemetry.summary();
    assert.equal(s.recentErrors.length, 20);
    // Should be the last 20 (indices 10..29)
    assert.equal(s.recentErrors[0].errorCode, "ERR_10");
    assert.equal(s.recentErrors[19].errorCode, "ERR_29");
  });

  // 10. startTimer captures latency correctly
  it("startTimer captures latency correctly", async () => {
    const done = telemetry.startTimer("searchVideos");

    // Wait a small amount of time so latency is measurable
    await new Promise((resolve) => setTimeout(resolve, 50));

    done({
      fallbackDepth: 1,
      sourceTier: "yt_dlp",
      success: true,
      cacheHit: false,
    });

    assert.equal(telemetry.count(), 1);
    const s = telemetry.summary();
    assert.equal(s.totalCalls, 1);
    assert.equal(s.topTools[0].tool, "searchVideos");
    // Latency should be at least 40ms (accounting for timer imprecision)
    assert.ok(s.avgLatencyMs >= 40, `expected latency >= 40ms, got ${s.avgLatencyMs}`);
    assert.equal(s.tierDistribution["yt_dlp"]?.count, 1);
  });

  // 11. reset() clears all metrics
  it("reset() clears all metrics", () => {
    telemetry.record(makeMetric());
    telemetry.record(makeMetric());
    assert.equal(telemetry.count(), 2);

    telemetry.reset();
    assert.equal(telemetry.count(), 0);

    const s = telemetry.summary();
    assert.equal(s.totalCalls, 0);
    assert.equal(s.successRate, 0);
    assert.deepEqual(s.topTools, []);
  });

  // 12. Circular buffer drops oldest when maxMetrics exceeded
  it("circular buffer drops oldest when maxMetrics exceeded", () => {
    const small = new Telemetry({ maxMetrics: 5 });

    // Insert 7 metrics — first 2 should be dropped
    for (let i = 0; i < 7; i++) {
      small.record(makeMetric({ latencyMs: i * 10, tool: `tool_${i}` }));
    }

    assert.equal(small.count(), 5);

    const s = small.summary();
    assert.equal(s.totalCalls, 5);

    // The oldest 2 (tool_0, tool_1) should be gone; tool_2..tool_6 remain
    const toolNames = s.topTools.map((t) => t.tool).sort();
    assert.deepEqual(toolNames, ["tool_2", "tool_3", "tool_4", "tool_5", "tool_6"]);

    // Average latency should be (20+30+40+50+60)/5 = 40
    assert.equal(s.avgLatencyMs, 40);
  });

  // 13. cacheHitRate computed correctly
  it("cacheHitRate computed correctly", () => {
    telemetry.record(makeMetric({ cacheHit: true }));
    telemetry.record(makeMetric({ cacheHit: true }));
    telemetry.record(makeMetric({ cacheHit: false }));
    // This one has no cacheHit info — should be excluded from rate calculation
    telemetry.record(makeMetric());

    const s = telemetry.summary();
    // 3 metrics have cacheHit defined, 2 are true => 2/3
    assert.ok(
      Math.abs(s.cacheHitRate - 2 / 3) < 0.001,
      `expected cacheHitRate ~0.667, got ${s.cacheHitRate}`
    );
  });

  // 14. summary() on empty metrics returns zeroes without crashing
  it("summary() on empty metrics returns zeroes without crashing", () => {
    const s = telemetry.summary();
    assert.equal(s.totalCalls, 0);
    assert.equal(s.successRate, 0);
    assert.equal(s.errorRate, 0);
    assert.equal(s.cacheHitRate, 0);
    assert.equal(s.avgLatencyMs, 0);
    assert.equal(s.p50LatencyMs, 0);
    assert.equal(s.p95LatencyMs, 0);
    assert.equal(s.p99LatencyMs, 0);
    assert.equal(s.avgFallbackDepth, 0);
    assert.ok(s.uptime >= 0);
  });

  // Extra: topTools is capped at 10
  it("topTools is capped at 10 entries", () => {
    for (let i = 0; i < 15; i++) {
      telemetry.record(makeMetric({ tool: `tool_${i}` }));
    }

    const s = telemetry.summary();
    assert.equal(s.topTools.length, 10);
  });

  // Extra: avgFallbackDepth computed correctly
  it("avgFallbackDepth computed correctly", () => {
    telemetry.record(makeMetric({ fallbackDepth: 0 }));
    telemetry.record(makeMetric({ fallbackDepth: 1 }));
    telemetry.record(makeMetric({ fallbackDepth: 2 }));

    const s = telemetry.summary();
    assert.equal(s.avgFallbackDepth, 1);
  });
});
