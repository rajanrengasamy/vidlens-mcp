import { describe, it } from "node:test";
import assert from "node:assert";
import { estimateTokens, type BenchmarkResult } from "../lib/token-benchmark.js";
import {
  RAW_VIDEO_RESPONSE,
  COMPACT_VIDEO_RESPONSE,
  RAW_CHANNEL_RESPONSE,
  COMPACT_CHANNEL_RESPONSE,
  RAW_SEARCH_RESPONSE,
  COMPACT_SEARCH_RESPONSE,
} from "./fixtures/raw-api-responses.js";

describe("Token Benchmark", () => {
  const benchmarks: BenchmarkResult[] = [];

  it("inspectVideo achieves ~75% token reduction", () => {
    const raw = estimateTokens(JSON.stringify(RAW_VIDEO_RESPONSE));
    const compact = estimateTokens(JSON.stringify(COMPACT_VIDEO_RESPONSE));
    const reduction = ((raw - compact) / raw) * 100;

    benchmarks.push({
      tool: "inspectVideo",
      rawTokens: raw,
      compactTokens: compact,
      reductionPct: reduction,
      target: 75,
      pass: reduction >= 65, // 10% tolerance
    });

    assert.ok(
      reduction >= 65,
      `inspectVideo reduction ${reduction.toFixed(1)}% below 65% threshold`,
    );
  });

  it("inspectChannel achieves ~87% token reduction", () => {
    const raw = estimateTokens(JSON.stringify(RAW_CHANNEL_RESPONSE));
    const compact = estimateTokens(JSON.stringify(COMPACT_CHANNEL_RESPONSE));
    const reduction = ((raw - compact) / raw) * 100;

    benchmarks.push({
      tool: "inspectChannel",
      rawTokens: raw,
      compactTokens: compact,
      reductionPct: reduction,
      target: 87,
      pass: reduction >= 77, // 10% tolerance
    });

    assert.ok(
      reduction >= 77,
      `inspectChannel reduction ${reduction.toFixed(1)}% below 77% threshold`,
    );
  });

  it("findVideos achieves ~64% token reduction", () => {
    const raw = estimateTokens(JSON.stringify(RAW_SEARCH_RESPONSE));
    const compact = estimateTokens(JSON.stringify(COMPACT_SEARCH_RESPONSE));
    const reduction = ((raw - compact) / raw) * 100;

    benchmarks.push({
      tool: "findVideos",
      rawTokens: raw,
      compactTokens: compact,
      reductionPct: reduction,
      target: 64,
      pass: reduction >= 54, // 10% tolerance
    });

    assert.ok(
      reduction >= 54,
      `findVideos reduction ${reduction.toFixed(1)}% below 54% threshold`,
    );
  });

  it("prints benchmark summary", () => {
    console.log("\n=== Token Benchmark Results ===");
    for (const b of benchmarks) {
      console.log(
        `${b.pass ? "PASS" : "FAIL"} ${b.tool}: ${b.rawTokens} -> ${b.compactTokens} tokens (${b.reductionPct.toFixed(1)}% reduction, target: ${b.target}%)`,
      );
    }
    console.log("===============================\n");
  });
});
