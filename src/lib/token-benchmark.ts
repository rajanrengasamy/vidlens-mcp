/**
 * Approximate token count using the 4-chars-per-token heuristic.
 * Good enough for regression detection — not intended for billing accuracy.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface BenchmarkResult {
  tool: string;
  rawTokens: number;
  compactTokens: number;
  reductionPct: number;
  target: number; // target reduction percentage
  pass: boolean; // within 10% of target
}
