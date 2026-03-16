import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyFieldProjection, applyTokenControls } from "../lib/token-controls.js";

describe("applyFieldProjection", () => {
  const sample = {
    title: "Test Video",
    channelTitle: "Test Channel",
    views: 1000,
    tags: ["a", "b"],
    nested: { foo: 1, bar: 2, baz: 3 },
  };

  it("returns only specified fields", () => {
    const result = applyFieldProjection(sample, ["title", "views"]);
    assert.deepEqual(result, { title: "Test Video", views: 1000 });
  });

  it("supports dot-notation for one level of nesting", () => {
    const result = applyFieldProjection(sample, ["nested.foo", "nested.baz"]);
    assert.deepEqual(result, { nested: { foo: 1, baz: 3 } });
  });

  it("returns full object when fields is undefined", () => {
    const result = applyFieldProjection(sample, undefined);
    assert.deepEqual(result, sample);
  });

  it("returns full object when fields is an empty array", () => {
    const result = applyFieldProjection(sample, []);
    assert.deepEqual(result, sample);
  });

  it("ignores non-existent fields gracefully", () => {
    const result = applyFieldProjection(sample, ["title", "nonExistent", "alsoMissing"]);
    assert.deepEqual(result, { title: "Test Video" });
  });

  it("handles mix of top-level and dot-notation fields", () => {
    const result = applyFieldProjection(sample, ["title", "nested.bar"]);
    assert.deepEqual(result, { title: "Test Video", nested: { bar: 2 } });
  });

  it("handles dot-notation on non-object value (returns value as-is)", () => {
    const result = applyFieldProjection(sample, ["views.something"]);
    // views is a number, not an object, so it gets returned as-is since the nested check fails
    assert.deepEqual(result, { views: 1000 });
  });
});

describe("applyTokenControls", () => {
  const fullOutput = {
    videoId: "abc123",
    title: "Test Video",
    sourceNotes: ["note1", "note2"],
    limitations: ["lim1"],
    provenance: {
      sourceTier: "youtube_api",
      sourceNotes: ["fetched via API"],
      fetchedAt: "2026-01-01T00:00:00Z",
      fallbackDepth: 0,
      partial: false,
    },
    data: "important",
  };

  it("with compact=true strips sourceNotes and limitations (arrays)", () => {
    const result = applyTokenControls(fullOutput, { compact: true });
    assert.equal("sourceNotes" in result, false, "sourceNotes should be stripped");
    assert.equal("limitations" in result, false, "limitations should be stripped");
    assert.equal(result.videoId, "abc123");
    assert.equal(result.title, "Test Video");
    assert.equal(result.data, "important");
  });

  it("with compact=true strips provenance.sourceNotes", () => {
    const result = applyTokenControls(fullOutput, { compact: true });
    const prov = result.provenance as Record<string, unknown>;
    assert.equal("sourceNotes" in prov, false, "provenance.sourceNotes should be stripped in compact mode");
    assert.equal(prov.sourceTier, "youtube_api");
  });

  it("with compact=false preserves everything", () => {
    const result = applyTokenControls(fullOutput, { compact: false });
    assert.deepEqual(result.sourceNotes, ["note1", "note2"]);
    assert.deepEqual(result.limitations, ["lim1"]);
    const prov = result.provenance as Record<string, unknown>;
    assert.deepEqual(prov.sourceNotes, ["fetched via API"]);
  });

  it("with fields applies projection", () => {
    const result = applyTokenControls(fullOutput, { compact: false, fields: ["videoId", "title"] });
    assert.deepEqual(result, { videoId: "abc123", title: "Test Video" });
  });

  it("with includeRaw attaches _raw key", () => {
    const rawData = { raw: "payload" };
    const result = applyTokenControls(fullOutput, { includeRaw: true }, rawData);
    assert.deepEqual(result._raw, { raw: "payload" });
    assert.equal(result.videoId, "abc123");
  });

  it("with includeRaw=false does not attach _raw key", () => {
    const rawData = { raw: "payload" };
    const result = applyTokenControls(fullOutput, { includeRaw: false }, rawData);
    assert.equal("_raw" in result, false);
  });

  it("defaults: compact=true, includeRaw=false, no fields", () => {
    // When controls object is provided but empty, defaults should apply
    const result = applyTokenControls(fullOutput, {});
    // compact=true by default: sourceNotes and limitations stripped
    assert.equal("sourceNotes" in result, false);
    assert.equal("limitations" in result, false);
    // includeRaw=false by default: no _raw
    assert.equal("_raw" in result, false);
    // no fields: all remaining keys present
    assert.equal(result.videoId, "abc123");
    assert.equal(result.title, "Test Video");
    assert.equal(result.data, "important");
  });

  it("returns output unchanged when controls is undefined", () => {
    const result = applyTokenControls(fullOutput, undefined);
    assert.deepEqual(result, fullOutput);
  });

  it("compact mode preserves sourceNotes when explicitly requested via fields", () => {
    const result = applyTokenControls(fullOutput, { compact: true, fields: ["sourceNotes", "videoId"] });
    assert.deepEqual(result.sourceNotes, ["note1", "note2"]);
    assert.equal(result.videoId, "abc123");
  });
});
