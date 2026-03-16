import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { CacheStore, buildCacheKey } from "../lib/cache-store.js";
import type { CacheEntityType } from "../lib/cache-store.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTempStore(
  overrides?: Partial<{
    maxEntries: number;
    cleanupIntervalMs: number;
  }>,
): { store: CacheStore; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), "vidlens-cache-test-"));
  const store = new CacheStore({
    dataDir: dir,
    cleanupIntervalMs: 60_000_000, // effectively disable periodic cleanup in tests
    ...overrides,
  });
  return { store, dir };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("CacheStore: set and get a value", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("key1", "video_meta", { title: "Hello" });
    const result = store.get<{ title: string }>("key1");
    assert.ok(result);
    assert.equal(result.title, "Hello");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: get returns null for non-existent key", () => {
  const { store, dir } = createTempStore();
  try {
    const result = store.get("no-such-key");
    assert.equal(result, null);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: get returns null for expired entry", () => {
  const { store, dir } = createTempStore();
  try {
    // Manually insert an already-expired entry via set then raw SQL
    store.set("exp-key", "search", { q: "test" });

    // Backdate the expires_at to the past using a second DB handle
    const db = new DatabaseSync(join(dir, "cache.db"));
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    db.prepare(
      "UPDATE cache_entries SET expires_at = ? WHERE key = ?",
    ).run(pastDate, "exp-key");
    db.close();

    const result = store.get("exp-key");
    assert.equal(result, null, "expired entry should return null");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: invalidate removes entry", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("del-me", "transcript", { text: "hello" });
    assert.ok(store.get("del-me"));

    const removed = store.invalidate("del-me");
    assert.equal(removed, true);
    assert.equal(store.get("del-me"), null);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: invalidate returns false for non-existent key", () => {
  const { store, dir } = createTempStore();
  try {
    const removed = store.invalidate("ghost");
    assert.equal(removed, false);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: invalidateByType removes matching entries only", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("s1", "search", { q: "a" });
    store.set("s2", "search", { q: "b" });
    store.set("v1", "video_meta", { id: "x" });

    const count = store.invalidateByType("search");
    assert.equal(count, 2);

    assert.equal(store.get("s1"), null);
    assert.equal(store.get("s2"), null);
    assert.ok(store.get("v1"), "video_meta should still exist");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: cleanup removes expired entries", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("live", "video_meta", { id: "1" });
    store.set("dead", "search", { q: "old" });

    // Backdate dead entry's expiration via a second DB handle
    const db = new DatabaseSync(join(dir, "cache.db"));
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    db.prepare(
      "UPDATE cache_entries SET expires_at = ? WHERE key = ?",
    ).run(pastDate, "dead");
    db.close();

    const removed = store.cleanup();
    assert.equal(removed, 1);

    assert.ok(store.get("live"), "live entry should survive cleanup");
    assert.equal(store.get("dead"), null);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: stats returns correct counts", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("a", "search", { q: "x" });
    store.set("b", "search", { q: "y" });
    store.set("c", "video_meta", { id: "z" });
    store.set("d", "embedding", [1, 2, 3]);

    const s = store.stats();
    assert.equal(s.total, 4);
    assert.equal(s.expired, 0);
    assert.equal(s.byType["search"], 2);
    assert.equal(s.byType["video_meta"], 1);
    assert.equal(s.byType["embedding"], 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: stats counts expired entries correctly", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("fresh", "search", { q: "new" });
    store.set("stale", "search", { q: "old" });

    const db = new DatabaseSync(join(dir, "cache.db"));
    const pastDate = new Date(Date.now() - 60_000).toISOString();
    db.prepare(
      "UPDATE cache_entries SET expires_at = ? WHERE key = ?",
    ).run(pastDate, "stale");
    db.close();

    const s = store.stats();
    assert.equal(s.total, 2);
    assert.equal(s.expired, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: persistent entries (embedding, collection) never expire", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("emb1", "embedding", [0.1, 0.2]);
    store.set("col1", "collection", { name: "my-set" });

    // Run cleanup — persistent entries should survive
    const removed = store.cleanup();
    assert.equal(removed, 0);

    assert.deepEqual(store.get("emb1"), [0.1, 0.2]);
    assert.deepEqual(store.get("col1"), { name: "my-set" });

    // Verify expires_at is null
    const s = store.stats();
    assert.equal(s.expired, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: multiple set() calls with same key update the value", () => {
  const { store, dir } = createTempStore();
  try {
    store.set("dup", "analysis", { version: 1 });
    assert.deepEqual(store.get("dup"), { version: 1 });

    store.set("dup", "analysis", { version: 2 });
    assert.deepEqual(store.get("dup"), { version: 2 });

    // Only one row should exist
    const s = store.stats();
    assert.equal(s.total, 1);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: close() stops cleanup timer", () => {
  const { store, dir } = createTempStore({ cleanupIntervalMs: 50 });
  try {
    // Just verify close() doesn't throw and the store is unusable after
    store.close();
    // Attempting to use the store after close should throw
    assert.throws(() => store.get("anything"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CacheStore: enforces maxEntries limit", () => {
  const { store, dir } = createTempStore({ maxEntries: 3 });
  try {
    store.set("a", "search", 1);
    store.set("b", "search", 2);
    store.set("c", "search", 3);
    store.set("d", "search", 4); // should evict oldest

    const s = store.stats();
    assert.equal(s.total, 3, "should not exceed maxEntries");

    // The newest entry should survive
    assert.ok(store.get("d"), "newest entry should survive eviction");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// buildCacheKey tests
// ---------------------------------------------------------------------------

test("buildCacheKey: produces stable, deterministic keys", () => {
  const k1 = buildCacheKey("search", { q: "hello", limit: 10 });
  const k2 = buildCacheKey("search", { q: "hello", limit: 10 });
  assert.equal(k1, k2);
});

test("buildCacheKey: produces different keys for different inputs", () => {
  const k1 = buildCacheKey("search", { q: "hello" });
  const k2 = buildCacheKey("search", { q: "world" });
  assert.notEqual(k1, k2);
});

test("buildCacheKey: produces different keys for different tool names", () => {
  const k1 = buildCacheKey("search", { q: "hello" });
  const k2 = buildCacheKey("trending", { q: "hello" });
  assert.notEqual(k1, k2);
});

test("buildCacheKey: key order does not matter", () => {
  const k1 = buildCacheKey("tool", { a: 1, b: 2, c: 3 });
  const k2 = buildCacheKey("tool", { c: 3, a: 1, b: 2 });
  assert.equal(k1, k2, "object key order should not affect the cache key");
});

test("buildCacheKey: format is toolName:hash", () => {
  const key = buildCacheKey("myTool", { x: 1 });
  assert.ok(key.startsWith("myTool:"), "key should start with tool name");
  const hash = key.split(":")[1];
  assert.equal(hash.length, 64, "hash should be 64-char hex (sha256)");
  assert.match(hash, /^[0-9a-f]+$/, "hash should be lowercase hex");
});
