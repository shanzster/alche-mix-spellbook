// Compiles image trigger(s) into a MindAR `.mind` file WITHOUT the native
// `canvas` dependency (which won't build on this machine). We decode the PNG
// with pure-JS pngjs and feed grayscale pixels straight into MindAR's own
// feature extractor, replicating what OfflineCompiler does internally.
//
// Usage: node scripts/compile-mind-target.mjs <in.png> [<in2.png> ...] <out.mind>
// Default (no args): all element trigger cards -> public/targets.mind
// IMPORTANT: input order = anchor order = AR_ELEMENTS order in CrystalAR.tsx.

import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { CompilerBase } from "mind-ar/src/image-target/compiler-base.js";
import { buildTrackingImageList } from "mind-ar/src/image-target/image-list.js";
import { extractTrackingFeatures } from "mind-ar/src/image-target/tracker/extract-utils.js";
import "mind-ar/src/image-target/detector/kernels/cpu/index.js";

// A minimal stand-in for an HTML canvas: MindAR only calls drawImage() then
// getImageData(), so we just hand back the RGBA buffer we already decoded.
class ShimCompiler extends CompilerBase {
  createProcessCanvas(img) {
    return {
      getContext: () => ({
        drawImage: () => {},
        getImageData: () => ({ data: img._rgba }),
      }),
    };
  }
  // Same body as MindAR's OfflineCompiler.compileTrack (minus native canvas).
  compileTrack({ progressCallback, targetImages, basePercent }) {
    return new Promise((resolve) => {
      const percentPerImage = (100 - basePercent) / targetImages.length;
      let percent = 0;
      const list = [];
      for (let i = 0; i < targetImages.length; i++) {
        const imageList = buildTrackingImageList(targetImages[i]);
        const percentPerAction = percentPerImage / imageList.length;
        const trackingData = extractTrackingFeatures(imageList, () => {
          percent += percentPerAction;
          progressCallback(basePercent + percent);
        });
        list.push(trackingData);
      }
      resolve(list);
    });
  }
}

function loadPng(file) {
  const png = PNG.sync.read(fs.readFileSync(file)); // always RGBA
  return { width: png.width, height: png.height, _rgba: png.data };
}

async function main() {
  const args = process.argv.slice(2);
  let inputs, out;
  if (args.length === 0) {
    inputs = [
      "public/image-trigger/image-trigger-alchemix.png",
      "public/image-trigger/image-trigger-helium.png",
    ];
    out = "public/targets.mind";
  } else {
    out = args[args.length - 1];
    inputs = args.slice(0, -1);
  }

  console.log("Compiling MindAR target(s):");
  inputs.forEach((f, i) => console.log(`  [${i}] ${f}`));

  const images = inputs.map(loadPng);
  images.forEach((im, i) =>
    console.log(`  [${i}] decoded ${im.width}x${im.height}`),
  );

  const compiler = new ShimCompiler();
  let last = -1;
  await compiler.compileImageTargets(images, (p) => {
    const pct = Math.floor(p);
    if (pct !== last && pct % 10 === 0) {
      console.log(`  ...${pct}%`);
      last = pct;
    }
  });

  const buffer = compiler.exportData();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(buffer));
  console.log(`\n✓ Wrote ${out} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
  console.log(`  Anchor order: ${inputs.map((f, i) => `${i}=${path.basename(f)}`).join(", ")}`);
}

main().catch((e) => {
  console.error("Compile failed:", e);
  process.exit(1);
});
