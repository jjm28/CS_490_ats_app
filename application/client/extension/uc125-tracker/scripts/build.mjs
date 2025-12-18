import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

function rmDir(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dst = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else copyFile(src, dst);
  }
}

async function main() {
  // Hard reset dist so timestamps always change
  rmDir(DIST);
  ensureDir(DIST);

  // 1) Bundle TS entrypoints -> dist/*.js (matches your manifest paths)
  await build({
    entryPoints: {
      contentScript: "src/content/contentScript.ts",
      popup: "src/ui/popup.ts",
      options: "src/ui/options.ts",
      service_worker: "src/service_worker.ts",
    },
    outdir: DIST,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    sourcemap: true,
    logLevel: "info",
  });

  // 2) Copy manifest.json (root) -> dist/manifest.json
  copyFile(path.join(ROOT, "manifest.json"), path.join(DIST, "manifest.json"));

  // 3) Copy UI HTML/CSS (source of truth = /ui folder)
  const uiSrc = path.join(ROOT, "ui");
  const uiDst = path.join(DIST, "ui");
  if (fs.existsSync(uiSrc)) copyDir(uiSrc, uiDst);

  console.log("\n✅ Extension build complete ->", DIST);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
