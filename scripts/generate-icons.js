// Simple icon generator using canvas (Node.js with canvas package)
// Run: node scripts/generate-icons.js
// Falls back to creating placeholder PNGs if canvas is unavailable

import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");

const sizes = [16, 32, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#6366f1");
  grad.addColorStop(1, "#8b5cf6");

  // Rounded rect
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Pen icon (simplified)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, size / 16);
  ctx.lineCap = "round";

  const s = size * 0.55;
  const ox = (size - s) / 2;
  const oy = (size - s) / 2;

  ctx.beginPath();
  ctx.moveTo(ox + s * 0.7, oy + s * 0.1);
  ctx.lineTo(ox + s * 0.9, oy + s * 0.3);
  ctx.lineTo(ox + s * 0.3, oy + s * 0.9);
  ctx.lineTo(ox + s * 0.1, oy + s * 0.9);
  ctx.lineTo(ox + s * 0.1, oy + s * 0.7);
  ctx.closePath();
  ctx.stroke();

  // Bottom line
  ctx.beginPath();
  ctx.moveTo(ox, oy + s);
  ctx.lineTo(ox + s, oy + s);
  ctx.stroke();

  const buffer = canvas.toBuffer("image/png");
  writeFileSync(join(publicDir, `icon${size}.png`), buffer);
  console.log(`Generated icon${size}.png`);
}
