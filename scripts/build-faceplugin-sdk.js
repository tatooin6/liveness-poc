#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const webpack = require("webpack");

async function copyDir(src, dest) {
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }));
}

async function copyWasmFiles(outputDir) {
  const ortEntry = require.resolve("onnxruntime-web");
  const ortRoot = path.resolve(path.dirname(ortEntry), "..");
  const wasmDir = path.join(ortRoot, "dist");
  const entries = await fs.readdir(wasmDir);
  await Promise.all(entries.filter((file) => file.endsWith(".wasm"))
    .map((file) => fs.copyFile(path.join(wasmDir, file), path.join(outputDir, file))));
}

async function syncStaticAssets(pkgRoot) {
  const projectRoot = process.cwd();
  const jsSource = path.join(pkgRoot, "js");
  const modelSource = path.join(pkgRoot, "model");
  await copyDir(jsSource, path.join(projectRoot, "js"));
  await copyDir(modelSource, path.join(projectRoot, "model"));
  console.log("[faceplugin] Synchronized js/ and model/ assets from the npm package.");
}

async function build() {
  const pkgEntry = require.resolve("faceplugin-face-recognition-js");
  const pkgRoot = path.dirname(pkgEntry);
  const entry = pkgEntry;
  const outputDir = path.join(pkgRoot, "dist");
  await fs.rm(outputDir, { recursive: true, force: true });

  const config = {
    mode: "production",
    devtool: false,
    target: ["web"],
    entry,
    output: {
      path: outputDir,
      filename: "facerecognition-sdk.js",
      library: {
        type: "umd",
      },
    },
  };

  console.log("[faceplugin] Bundling SDK via webpack...");
  webpack(config, async (err, stats) => {
    if (err) {
      console.error("[faceplugin] Failed to bundle SDK:", err);
      process.exitCode = 1;
      return;
    }
    if (stats.hasErrors()) {
      console.error(stats.toString({ colors: true }));
      process.exitCode = 1;
      return;
    }
    try {
      await copyWasmFiles(outputDir);
      await syncStaticAssets(pkgRoot);
    } catch (copyError) {
      console.error("[faceplugin] Failed to copy WebAssembly files:", copyError);
      process.exitCode = 1;
      return;
    }
    console.log(`[faceplugin] SDK ready at ${outputDir}`);
    console.log("[faceplugin] Reference node_modules/faceplugin-face-recognition-js/dist/facerecognition-sdk.js in your HTML.");
  });
}

build().catch((error) => {
  console.error("[faceplugin] Unexpected error:", error);
  process.exitCode = 1;
});
