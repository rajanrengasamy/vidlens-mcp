#!/usr/bin/env node
import { runCli } from "./lib/cli-runtime.js";

runCli(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`youtube-mcp failed: ${message}\n`);
  process.exitCode = 1;
});
