import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { detectKnownClients, keyTransparencySummary } from "../lib/install-diagnostics.js";

test("detectKnownClients finds Claude Desktop config and Codex binary from a mocked environment", () => {
  const root = mkdtempSync(join(tmpdir(), "youtube-mcp-install-"));
  const homeDir = join(root, "home");
  const cwd = join(root, "workspace");
  const binDir = join(root, "bin");

  mkdirSync(join(homeDir, "Library", "Application Support", "Claude"), { recursive: true });
  mkdirSync(cwd, { recursive: true });
  mkdirSync(binDir, { recursive: true });

  writeFileSync(
    join(homeDir, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    JSON.stringify({ mcpServers: {} }, null, 2),
    "utf8",
  );

  const codexPath = join(binDir, "codex");
  writeFileSync(codexPath, "#!/bin/sh\necho codex\n", "utf8");
  chmodSync(codexPath, 0o755);

  const detections = detectKnownClients({
    homeDir,
    cwd,
    platform: "darwin",
    env: {
      PATH: binDir,
    },
  });

  const claudeDesktop = detections.find((client) => client.clientId === "claude_desktop");
  const codex = detections.find((client) => client.clientId === "codex");

  assert.equal(claudeDesktop?.detected, true);
  assert.equal(claudeDesktop?.supportLevel, "supported");
  assert.equal(codex?.detected, true);
  assert.equal(codex?.binary, codexPath);
});

test("keyTransparencySummary explains optional keys clearly", () => {
  const rows = keyTransparencySummary();
  assert.equal(rows.length, 2);
  assert.equal(rows.some((row) => row.key === "YOUTUBE_API_KEY"), true);
  assert.equal(rows.some((row) => row.key.includes("GEMINI_API_KEY")), true);
});
