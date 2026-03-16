export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 (default: 0.25 — adds up to 25% random jitter) */
  jitterFactor?: number;
  /** Function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Optional callback on each retry (for logging/telemetry) */
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

const RETRYABLE_NETWORK_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

/** Default retryable error checker. Returns true for:
 *  - HTTP 429 (Too Many Requests)
 *  - HTTP 5xx
 *  - Network errors: ETIMEDOUT, ECONNRESET, ECONNREFUSED, ENOTFOUND, EAI_AGAIN
 *  - Error objects with retryable: true
 */
export function isRetryableError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;

  const err = error as Record<string, unknown>;

  // Explicit retryable flag
  if (err.retryable === true) return true;

  // Network error codes
  if (typeof err.code === "string" && RETRYABLE_NETWORK_CODES.has(err.code)) {
    return true;
  }

  // HTTP status codes
  const status =
    typeof err.status === "number"
      ? err.status
      : typeof err.statusCode === "number"
        ? err.statusCode
        : undefined;

  if (status !== undefined) {
    if (status === 429) return true;
    if (status >= 500 && status < 600) return true;
  }

  return false;
}

/** Calculate delay for attempt N with exponential backoff + jitter. */
export function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number,
): number {
  const exponential = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = 1 + Math.random() * jitterFactor;
  return Math.round(capped * jitter);
}

/** Execute a function with retry logic. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    jitterFactor = 0.25,
    isRetryable = isRetryableError,
    onRetry,
  } = options ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or the error isn't retryable
      if (attempt >= maxRetries || !isRetryable(error)) {
        throw error;
      }

      const delayMs = calculateDelay(
        attempt,
        baseDelayMs,
        maxDelayMs,
        jitterFactor,
      );

      onRetry?.(error, attempt + 1, delayMs);

      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Unreachable, but satisfies TypeScript
  throw lastError;
}
