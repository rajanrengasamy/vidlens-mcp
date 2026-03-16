/**
 * In-memory telemetry/metrics collector for VidLens MCP server diagnostics.
 * Resets on server restart. Designed to be queried by the checkSystemHealth tool.
 */

export interface ToolCallMetric {
  tool: string;
  latencyMs: number;
  fallbackDepth: number; // 0 = primary source, 1 = first fallback, etc.
  sourceTier: string; // "youtube_api" | "yt_dlp" | "page_extract" | "none"
  success: boolean;
  errorCode?: string; // GracefulError code if failed
  cacheHit?: boolean;
  timestamp: number; // Date.now()
}

export interface TelemetrySummary {
  uptime: number; // seconds since start
  totalCalls: number;
  successRate: number; // 0..1
  errorRate: number; // 0..1
  cacheHitRate: number; // 0..1
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  avgFallbackDepth: number;

  /** Per-tier breakdown */
  tierDistribution: Record<string, { count: number; pct: number }>;

  /** Per-tool breakdown (top 10 by call count) */
  topTools: Array<{
    tool: string;
    calls: number;
    successRate: number;
    avgLatencyMs: number;
    avgFallbackDepth: number;
  }>;

  /** Error breakdown by code */
  errorBreakdown: Record<string, number>;

  /** Recent errors (last 20) */
  recentErrors: Array<{
    tool: string;
    errorCode: string;
    timestamp: number;
    latencyMs: number;
  }>;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

export class Telemetry {
  private readonly startTime: number;
  private readonly metrics: ToolCallMetric[];
  private readonly maxMetrics: number;
  private head: number; // next write position
  private size: number; // current number of stored metrics

  constructor(options?: { maxMetrics?: number }) {
    this.startTime = Date.now();
    this.maxMetrics = options?.maxMetrics ?? 10_000;
    this.metrics = new Array<ToolCallMetric>(this.maxMetrics);
    this.head = 0;
    this.size = 0;
  }

  /** Record a tool call. */
  record(metric: ToolCallMetric): void {
    this.metrics[this.head] = metric;
    this.head = (this.head + 1) % this.maxMetrics;
    if (this.size < this.maxMetrics) {
      this.size++;
    }
  }

  /** Get a summary of all metrics. */
  summary(): TelemetrySummary {
    const now = Date.now();
    const uptime = (now - this.startTime) / 1000;

    const all = this.getAllMetrics();
    const totalCalls = all.length;

    if (totalCalls === 0) {
      return {
        uptime,
        totalCalls: 0,
        successRate: 0,
        errorRate: 0,
        cacheHitRate: 0,
        avgLatencyMs: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
        p99LatencyMs: 0,
        avgFallbackDepth: 0,
        tierDistribution: {},
        topTools: [],
        errorBreakdown: {},
        recentErrors: [],
      };
    }

    // Success / error rates
    const successCount = all.filter((m) => m.success).length;
    const successRate = successCount / totalCalls;
    const errorRate = 1 - successRate;

    // Cache hit rate (only among metrics where cacheHit is defined)
    const withCacheInfo = all.filter((m) => m.cacheHit !== undefined);
    const cacheHitRate =
      withCacheInfo.length > 0
        ? withCacheInfo.filter((m) => m.cacheHit).length / withCacheInfo.length
        : 0;

    // Latency stats
    const latencies = all.map((m) => m.latencyMs);
    const avgLatencyMs = latencies.reduce((a, b) => a + b, 0) / totalCalls;
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p50LatencyMs = percentile(sortedLatencies, 0.5);
    const p95LatencyMs = percentile(sortedLatencies, 0.95);
    const p99LatencyMs = percentile(sortedLatencies, 0.99);

    // Average fallback depth
    const avgFallbackDepth =
      all.reduce((a, m) => a + m.fallbackDepth, 0) / totalCalls;

    // Tier distribution
    const tierCounts: Record<string, number> = {};
    for (const m of all) {
      tierCounts[m.sourceTier] = (tierCounts[m.sourceTier] ?? 0) + 1;
    }
    const tierDistribution: Record<string, { count: number; pct: number }> = {};
    for (const [tier, count] of Object.entries(tierCounts)) {
      tierDistribution[tier] = { count, pct: count / totalCalls };
    }

    // Per-tool breakdown
    const toolMap = new Map<
      string,
      { calls: number; successes: number; totalLatency: number; totalFallback: number }
    >();
    for (const m of all) {
      const entry = toolMap.get(m.tool) ?? {
        calls: 0,
        successes: 0,
        totalLatency: 0,
        totalFallback: 0,
      };
      entry.calls++;
      if (m.success) entry.successes++;
      entry.totalLatency += m.latencyMs;
      entry.totalFallback += m.fallbackDepth;
      toolMap.set(m.tool, entry);
    }
    const topTools = [...toolMap.entries()]
      .sort((a, b) => b[1].calls - a[1].calls)
      .slice(0, 10)
      .map(([tool, stats]) => ({
        tool,
        calls: stats.calls,
        successRate: stats.successes / stats.calls,
        avgLatencyMs: stats.totalLatency / stats.calls,
        avgFallbackDepth: stats.totalFallback / stats.calls,
      }));

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    for (const m of all) {
      if (!m.success && m.errorCode) {
        errorBreakdown[m.errorCode] = (errorBreakdown[m.errorCode] ?? 0) + 1;
      }
    }

    // Recent errors (last 20)
    const errors = all
      .filter((m) => !m.success && m.errorCode)
      .map((m) => ({
        tool: m.tool,
        errorCode: m.errorCode!,
        timestamp: m.timestamp,
        latencyMs: m.latencyMs,
      }));
    const recentErrors = errors.slice(-20);

    return {
      uptime,
      totalCalls,
      successRate,
      errorRate,
      cacheHitRate,
      avgLatencyMs,
      p50LatencyMs,
      p95LatencyMs,
      p99LatencyMs,
      avgFallbackDepth,
      tierDistribution,
      topTools,
      errorBreakdown,
      recentErrors,
    };
  }

  /** Record the start of a tool call, returns a function to call when done. */
  startTimer(
    tool: string
  ): (result: {
    fallbackDepth: number;
    sourceTier: string;
    success: boolean;
    errorCode?: string;
    cacheHit?: boolean;
  }) => void {
    const start = Date.now();
    return (result) => {
      const latencyMs = Date.now() - start;
      this.record({
        tool,
        latencyMs,
        fallbackDepth: result.fallbackDepth,
        sourceTier: result.sourceTier,
        success: result.success,
        errorCode: result.errorCode,
        cacheHit: result.cacheHit,
        timestamp: Date.now(),
      });
    };
  }

  /** Reset all metrics. */
  reset(): void {
    this.head = 0;
    this.size = 0;
    // Clear references so old metrics can be GC'd
    this.metrics.fill(undefined as unknown as ToolCallMetric);
  }

  /** Total recorded metrics count. */
  count(): number {
    return this.size;
  }

  /** Retrieve all stored metrics in insertion order (oldest first). */
  private getAllMetrics(): ToolCallMetric[] {
    if (this.size < this.maxMetrics) {
      // Buffer hasn't wrapped yet — metrics are at indices 0..size-1
      return this.metrics.slice(0, this.size);
    }
    // Buffer has wrapped — head points to oldest entry
    return [
      ...this.metrics.slice(this.head, this.maxMetrics),
      ...this.metrics.slice(0, this.head),
    ];
  }
}
