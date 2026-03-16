import assert from "node:assert/strict";
import test from "node:test";
import {
  withRetry,
  calculateDelay,
  isRetryableError,
} from "../lib/retry.js";

test("withRetry returns value on first success", async () => {
  const result = await withRetry(async () => 42);
  assert.equal(result, 42);
});

test("withRetry retries on retryable error then succeeds", async () => {
  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts++;
      if (attempts < 3) {
        const err = new Error("temporary") as Error & { code: string };
        err.code = "ECONNRESET";
        throw err;
      }
      return "ok";
    },
    { baseDelayMs: 10, maxDelayMs: 50 },
  );

  assert.equal(result, "ok");
  assert.equal(attempts, 3);
});

test("withRetry throws after maxRetries exhausted", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          attempts++;
          const err = new Error("fail") as Error & { code: string };
          err.code = "ETIMEDOUT";
          throw err;
        },
        { maxRetries: 2, baseDelayMs: 10 },
      ),
    { message: "fail" },
  );
  // 1 initial + 2 retries = 3 total attempts
  assert.equal(attempts, 3);
});

test("withRetry does not retry non-retryable errors", async () => {
  let attempts = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          attempts++;
          const err = new Error("bad request") as Error & { status: number };
          err.status = 400;
          throw err;
        },
        { maxRetries: 3, baseDelayMs: 10 },
      ),
    { message: "bad request" },
  );
  assert.equal(attempts, 1, "should not retry a 400 error");
});

test("calculateDelay increases exponentially", () => {
  const d0 = calculateDelay(0, 1000, 30_000, 0);
  const d1 = calculateDelay(1, 1000, 30_000, 0);
  const d2 = calculateDelay(2, 1000, 30_000, 0);

  assert.equal(d0, 1000);
  assert.equal(d1, 2000);
  assert.equal(d2, 4000);
});

test("calculateDelay respects maxDelay cap", () => {
  const delay = calculateDelay(10, 1000, 5000, 0);
  assert.equal(delay, 5000);
});

test("calculateDelay adds jitter", () => {
  // With jitter factor 1.0, delay should be between base and 2*base
  const delays = new Set<number>();
  for (let i = 0; i < 20; i++) {
    delays.add(calculateDelay(0, 1000, 30_000, 1.0));
  }
  // At least some variation (extremely unlikely all 20 are the same with random jitter)
  assert.ok(delays.size > 1, "jitter should produce varying delays");

  for (const d of delays) {
    assert.ok(d >= 1000, `delay ${d} should be >= 1000`);
    assert.ok(d <= 2000, `delay ${d} should be <= 2000`);
  }
});

test("isRetryableError recognizes network errors", () => {
  for (const code of ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN"]) {
    const err = new Error("network") as Error & { code: string };
    err.code = code;
    assert.equal(isRetryableError(err), true, `${code} should be retryable`);
  }
});

test("isRetryableError recognizes HTTP 429 and 5xx", () => {
  assert.equal(isRetryableError({ status: 429 }), true);
  assert.equal(isRetryableError({ statusCode: 429 }), true);
  assert.equal(isRetryableError({ status: 500 }), true);
  assert.equal(isRetryableError({ status: 502 }), true);
  assert.equal(isRetryableError({ status: 503 }), true);
  assert.equal(isRetryableError({ statusCode: 599 }), true);
});

test("isRetryableError returns false for 400/404", () => {
  assert.equal(isRetryableError({ status: 400 }), false);
  assert.equal(isRetryableError({ status: 404 }), false);
  assert.equal(isRetryableError({ status: 403 }), false);
});

test("isRetryableError recognizes retryable flag", () => {
  assert.equal(isRetryableError({ retryable: true }), true);
  assert.equal(isRetryableError({ retryable: false }), false);
});

test("isRetryableError returns false for null/undefined/primitives", () => {
  assert.equal(isRetryableError(null), false);
  assert.equal(isRetryableError(undefined), false);
  assert.equal(isRetryableError("string error"), false);
  assert.equal(isRetryableError(42), false);
});

test("onRetry callback fires on each retry", async () => {
  const retries: Array<{ attempt: number; delayMs: number }> = [];

  let attempts = 0;
  await withRetry(
    async () => {
      attempts++;
      if (attempts <= 2) {
        const err = new Error("temp") as Error & { code: string };
        err.code = "ECONNRESET";
        throw err;
      }
      return "done";
    },
    {
      maxRetries: 3,
      baseDelayMs: 10,
      maxDelayMs: 50,
      onRetry: (_err, attempt, delayMs) => {
        retries.push({ attempt, delayMs });
      },
    },
  );

  assert.equal(retries.length, 2);
  assert.equal(retries[0].attempt, 1);
  assert.equal(retries[1].attempt, 2);
  assert.ok(retries[0].delayMs > 0);
  assert.ok(retries[1].delayMs > 0);
});
