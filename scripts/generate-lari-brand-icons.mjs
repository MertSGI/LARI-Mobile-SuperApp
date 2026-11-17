// Rasterizes the official LARİ logo pack (public/brand/*.svg) into OPAQUE Android launcher,
// adaptive-icon, splash and PWA assets using headless Chromium (no transparent corners).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

const BG_GRADIENT = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#1D1352"/><stop offset="50%" stop-color="#2C1A88"/><stop offset="100%" stop-color="#3B23C4"/></linearGradient>`;
const DOT_GRADIENT = `<linearGradient id="dot" x1="753.4" y1="195.7" x2="753.4" y2="315.3" gradientUnits="userSpaceOnUse">
  <stop offset="0%" stop-color="#16CFD1"/><stop offset="100%" stop-color="#15B89B"/></linearGradient>`;
const SYMBOL = `<path d="M 810.8 326.8 A 352.8 352.8 0 1 1 679.4 203.5" stroke="#FFFFFF" stroke-width="36.6" fill="none"/>
  <path d="M 398.4 314.7 C 433.9 314.7, 462.6 344.8, 462.6 382.0 L 462.6 612.0 C 462.6 630.2, 477.3 644.9, 495.5 644.9 L 610.5 644.9 C 645.2 644.9, 673.4 673.1, 673.4 707.8 L 494.2 707.8 C 441.3 707.8, 398.4 664.9, 398.4 612.0 Z" fill="#FFFFFF"/>
  <circle cx="753.4" cy="255.5" r="59.8" fill="url(#dot)"/>`;

// Symbol bounding box in 1024 space ~ (141..866, 141..866). Center ~ (512, 520).
function symbolGroup(scale) {
  const s = scale;
  return `<g transform="translate(${512 - 512 * s}, ${512 - 520 * s}) scale(${s})">${SYMBOL}</g>`;
}

function svgDoc(w, h, { background, symbolScale }) {
  // Symbol is drawn in a centered 1024 box fitted to min(w,h)
  const box = Math.min(w, h);
  const ox = (w - box) / 2;
  const oy = (h - box) / 2;
  const bgRect = background
    ? `<rect width="${w}" height="${h}" fill="url(#bg)"/>`
    : '';
  const sym = symbolScale
    ? `<g transform="translate(${ox}, ${oy}) scale(${box / 1024})">${symbolGroup(symbolScale)}</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>${BG_GRADIENT}${DOT_GRADIENT}</defs>${bgRect}${sym}</svg>`;
}

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const jobs = [];
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const adaptive = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [dpi, size] of Object.entries(legacy)) {
  // Opaque full-bleed square: launcher applies its own mask, no transparent corners.
  jobs.push({ out: path.join(res, `mipmap-${dpi}`, 'ic_launcher.png'), w: size, h: size, background: true, symbolScale: 0.86, transparent: false });
  jobs.push({ out: path.join(res, `mipmap-${dpi}`, 'ic_launcher_round.png'), w: size, h: size, background: true, symbolScale: 0.86, transparent: false });
}
for (const [dpi, size] of Object.entries(adaptive)) {
  // Adaptive foreground: symbol inside the 66dp safe zone of 108dp.
  jobs.push({ out: path.join(res, `mipmap-${dpi}`, 'ic_launcher_foreground.png'), w: size, h: size, background: false, symbolScale: 0.6, transparent: true });
  jobs.push({ out: path.join(res, `mipmap-${dpi}`, 'ic_launcher_background.png'), w: size, h: size, background: true, symbolScale: 0, transparent: false });
}
// Splash screens keep existing dimensions
for (const dir of fs.readdirSync(res)) {
  const f = path.join(res, dir, 'splash.png');
  if (fs.existsSync(f)) {
    const { w, h } = pngSize(f);
    jobs.push({ out: f, w, h, background: true, symbolScale: 0.42, transparent: false });
  }
}
// PWA / web icons (opaque)
const icons = path.join(root, 'public', 'icons');
jobs.push({ out: path.join(icons, 'icon-192.png'), w: 192, h: 192, background: true, symbolScale: 0.86, transparent: false });
jobs.push({ out: path.join(icons, 'icon-512.png'), w: 512, h: 512, background: true, symbolScale: 0.86, transparent: false });
jobs.push({ out: path.join(icons, 'maskable-512.png'), w: 512, h: 512, background: true, symbolScale: 0.62, transparent: false });
jobs.push({ out: path.join(icons, 'apple-touch-icon.png'), w: 180, h: 180, background: true, symbolScale: 0.86, transparent: false });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
for (const job of jobs) {
  await page.setViewportSize({ width: job.w, height: job.h });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svgDoc(job.w, job.h, job)}</body></html>`
  );
  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  await page.screenshot({
    path: job.out,
    omitBackground: job.transparent,
    clip: { x: 0, y: 0, width: job.w, height: job.h },
  });
  console.log(`wrote ${path.relative(root, job.out)} ${job.w}x${job.h}${job.transparent ? ' (fg)' : ' (opaque)'}`);
}
await browser.close();

// Adaptive icon XML: gradient background mipmap + symbol foreground
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
for (const n of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', n), adaptiveXml);
}
fs.writeFileSync(
  path.join(res, 'values', 'ic_launcher_background.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#2C1A88</color>\n</resources>\n`
);
console.log(`PASS: ${jobs.length} LARİ brand assets generated`);
