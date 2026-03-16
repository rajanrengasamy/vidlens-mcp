import assert from "node:assert/strict";
import test from "node:test";
import {
  RateLimiter,
  createYouTubeApiLimiter,
  createYtDlpLimiter,
  createGeneralLimiter,
} from "../lib/rate-limiter.js";

test("acquire succeeds immediately when tokens available", async () => {
  const limiter = new RateLimiter({
    maxTokens: 10,
    refillRate: 1,
    refillIntervalMs: 1000,
  });
  const waitMs = await limiter.acquire();
  assert.equal(waitMs, 0);
  assert.equal(limiter.available(), 9);
});

test("acquire blocks when bucket is empty", async () => {
  const limiter = new RateLimiter({
    maxTokens: 1,
    refillRate: 1,
    refillIntervalMs: 100, // fast refill for test speed
  });

  // Drain the bucket
  await limiter.acquire();

  const start = Date.now();
  const waitMs = await limiter.acquire();
  const elapsed = Date.now() - start;

  assert.ok(waitMs > 0, `expected positive wait, got ${waitMs}`);
  assert.ok(elapsed >= 50, `expected elapsed >= 50ms, got ${elapsed}ms`);
});

test("tryAcquire returns false when empty", () => {
  const limiter = new RateLimiter({
    maxTokens: 1,
    refillRate: 1,
    refillIntervalMs: 60_000,
  });
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), false);
});

test("tokens refill over time", async () => {
  const limiter = new RateLimiter({
    maxTokens: 5,
    refillRate: 5,
    refillIntervalMs: 100,
  });

  // Drain all tokens
  for (let i = 0; i < 5; i++) limiter.tryAcquire();
  assert.equal(limiter.available(), 0);

  // Wait for a refill interval
  await new Promise((r) => setTimeout(r, 120));

  const avail = limiter.available();
  assert.ok(avail > 0, `expected tokens to refill, got ${avail}`);
});

test("stats track correctly", async () => {
  const limiter = new RateLimiter({
    maxTokens: 5,
    refillRate: 5,
    refillIntervalMs: 100,
  });

  await limiter.acquire();
  await limiter.acquire();
  limiter.tryAcquire();
  // Drain remaining
  limiter.tryAcquire();
  limiter.tryAcquire();
  // This should be denied
  const denied = limiter.tryAcquire();
  assert.equal(denied, false);

  const s = limiter.stats();
  assert.equal(s.totalAcquired, 5);
  assert.equal(s.totalDenied, 1);
});

test("reset restores full capacity", () => {
  const limiter = new RateLimiter({
    maxTokens: 10,
    refillRate: 1,
    refillIntervalMs: 60_000,
  });

  for (let i = 0; i < 10; i++) limiter.tryAcquire();
  assert.equal(limiter.available(), 0);

  limiter.reset();
  assert.equal(limiter.available(), 10);

  const s = limiter.stats();
  assert.equal(s.totalAcquired, 0);
  assert.equal(s.totalDenied, 0);
  assert.equal(s.totalWaitMs, 0);
});

test("cost parameter deducts correct amount", async () => {
  const limiter = new RateLimiter({
    maxTokens: 10,
    refillRate: 1,
    refillIntervalMs: 60_000,
  });

  await limiter.acquire(3);
  assert.equal(limiter.available(), 7);

  assert.equal(limiter.tryAcquire(7), true);
  assert.equal(limiter.available(), 0);

  assert.equal(limiter.tryAcquire(1), false);
});

test("acquire rejects cost exceeding maxTokens", async () => {
  const limiter = new RateLimiter({
    maxTokens: 5,
    refillRate: 1,
    refillIntervalMs: 1000,
  });

  await assert.rejects(() => limiter.acquire(10), /exceeds max bucket capacity/);
});

test("factory: createYouTubeApiLimiter creates limiter with 50 burst capacity", () => {
  const limiter = createYouTubeApiLimiter();
  assert.equal(limiter.available(), 50);
});

test("factory: createYtDlpLimiter creates limiter with 10 burst capacity", () => {
  const limiter = createYtDlpLimiter();
  assert.equal(limiter.available(), 10);
});

test("factory: createGeneralLimiter creates limiter with 20 burst capacity", () => {
  const limiter = createGeneralLimiter();
  assert.equal(limiter.available(), 20);
});
