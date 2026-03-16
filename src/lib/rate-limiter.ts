export interface RateLimiterOptions {
  /** Max tokens in the bucket */
  maxTokens: number;
  /** Tokens added per refill interval */
  refillRate: number;
  /** Refill interval in milliseconds */
  refillIntervalMs: number;
  /** Name for logging/diagnostics */
  name?: string;
}

interface RateLimiterStats {
  totalAcquired: number;
  totalWaitMs: number;
  totalDenied: number;
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly options: Required<RateLimiterOptions>;
  private _stats: RateLimiterStats;

  constructor(options: RateLimiterOptions) {
    this.options = {
      name: "default",
      ...options,
    };
    this.tokens = this.options.maxTokens;
    this.lastRefill = Date.now();
    this._stats = { totalAcquired: 0, totalWaitMs: 0, totalDenied: 0 };
  }

  /** Lazily refill tokens based on elapsed time since last refill. */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;

    const intervals = elapsed / this.options.refillIntervalMs;
    const newTokens = intervals * this.options.refillRate;

    if (newTokens >= 1) {
      this.tokens = Math.min(this.options.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  /**
   * Acquire token(s), waiting if necessary.
   * Returns the wait time in ms (0 if immediate).
   */
  async acquire(cost = 1): Promise<number> {
    if (cost <= 0) throw new Error("Cost must be positive");
    if (cost > this.options.maxTokens) {
      throw new Error(
        `Cost ${cost} exceeds max bucket capacity ${this.options.maxTokens}`,
      );
    }

    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      this._stats.totalAcquired += cost;
      return 0;
    }

    // Calculate how long we need to wait for enough tokens
    const deficit = cost - this.tokens;
    const intervalsNeeded = deficit / this.options.refillRate;
    const waitMs = Math.ceil(intervalsNeeded * this.options.refillIntervalMs);

    await new Promise<void>((resolve) => setTimeout(resolve, waitMs));

    this.refill();
    this.tokens -= cost;
    this._stats.totalAcquired += cost;
    this._stats.totalWaitMs += waitMs;

    return waitMs;
  }

  /** Try to acquire without waiting. Returns true if acquired. */
  tryAcquire(cost = 1): boolean {
    if (cost <= 0) throw new Error("Cost must be positive");

    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      this._stats.totalAcquired += cost;
      return true;
    }

    this._stats.totalDenied += 1;
    return false;
  }

  /** Current available tokens. */
  available(): number {
    this.refill();
    return this.tokens;
  }

  /** Reset to full capacity. */
  reset(): void {
    this.tokens = this.options.maxTokens;
    this.lastRefill = Date.now();
    this._stats = { totalAcquired: 0, totalWaitMs: 0, totalDenied: 0 };
  }

  /** Get diagnostics: total acquired, total waited, total denied. */
  stats(): RateLimiterStats {
    return { ...this._stats };
  }
}

// ── Factory presets ──────────────────────────────────────────────────

/**
 * YouTube Data API v3: 10,000 quota units/day ~ 7 units/min sustained.
 * Burst-friendly: allow 50 in a minute, but sustained 7/min.
 */
export function createYouTubeApiLimiter(): RateLimiter {
  return new RateLimiter({
    maxTokens: 50,
    refillRate: 7,
    refillIntervalMs: 60_000,
    name: "youtube-api",
  });
}

/** yt-dlp: avoid hammering YouTube. 10 concurrent-ish calls per minute. */
export function createYtDlpLimiter(): RateLimiter {
  return new RateLimiter({
    maxTokens: 10,
    refillRate: 10,
    refillIntervalMs: 60_000,
    name: "yt-dlp",
  });
}

/** General fallback: conservative. */
export function createGeneralLimiter(): RateLimiter {
  return new RateLimiter({
    maxTokens: 20,
    refillRate: 10,
    refillIntervalMs: 60_000,
    name: "general",
  });
}
