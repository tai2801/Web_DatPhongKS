// Sinh anh SVG minh hoa cho khach san (khong hotlink anh ngoai).
// Moi khach san 3 anh (a/b/c): canh bien, nui, pho, song... bang gradient + hinh khoi.
// Chay: node tools/generate-images.mjs  -> frontend/public/images/*.svg
import fs from 'node:fs';
import path from 'node:path';

const outDir = new URL('../frontend/public/images/', import.meta.url).pathname;
fs.mkdirSync(outDir, { recursive: true });

const SCENES = {
  h1: { name: 'Azure Bay Resort & Spa', palettes: [['#0e5a7d', '#7fd1e8', '#f7e3b0'], ['#083b5c', '#3f8ea6', '#ffd9a0'], ['#12708f', '#a8e0d8', '#fff3d6']] },
  h2: { name: 'Hanoi Old Quarter Hotel', palettes: [['#8a4b2a', '#e8b04b', '#f7ead0'], ['#5c3421', '#c97e3f', '#ffe9c4'], ['#a05a2c', '#eec27a', '#fdf3dd']] },
  h3: { name: 'Dalat Pine Hill Retreat', palettes: [['#1f4d2e', '#7fb069', '#eaf5e0'], ['#173d27', '#5d9153', '#dff0d2'], ['#2a5d3a', '#98c379', '#f0f7e6']] },
  h4: { name: 'Phu Quoc Coral Beach Resort', palettes: [['#0b6e6e', '#5ec8c0', '#ffe3c2'], ['#084f5e', '#f2a65a', '#ffd9a0'], ['#0e7d7b', '#8fe0d8', '#fff0d0']] },
  h5: { name: 'Saigon Riverside Boutique', palettes: [['#27355e', '#7d8fc4', '#f2d5a0'], ['#1b2547', '#5a6fa8', '#e8b04b'], ['#31456f', '#9db1dd', '#ffe9c4']] },
  h6: { name: 'Hue Heritage Garden Hotel', palettes: [['#4a6741', '#a8c686', '#f7f0d8'], ['#38502f', '#8cb369', '#eef3da'], ['#55744b', '#bcd29a', '#fdf6e0']] },
};

function scene(id, [sky, mid, sand], variant) {
  const sunX = 480 + variant * 160;
  const sunY = 120 + variant * 30;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${mid}"/><stop offset="1" stop-color="${sand}"/>
    </linearGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${mid}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#sky)"/>
  <circle cx="${sunX}" cy="${sunY}" r="46" fill="#fff7dd" opacity="0.9"/>
  <rect y="300" width="800" height="200" fill="url(#sea)"/>
  <path d="M0 300 Q 200 ${282 + variant * 6} 400 300 T 800 300 V500 H0 Z" fill="${sky}" opacity="0.35"/>
  <g fill="#ffffff" opacity="0.92">
    <rect x="${90 + variant * 40}" y="170" width="150" height="130" rx="6"/>
    <rect x="${270 + variant * 30}" y="130" width="190" height="170" rx="6"/>
    <rect x="${500 + variant * 20}" y="185" width="130" height="115" rx="6"/>
  </g>
  <g fill="${sky}">
    ${[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => `<rect x="${288 + c * 36}" y="${148 + r * 36}" width="18" height="20" rx="2"/>`).join('')).join('')}
    ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${106 + c * 42}" y="${188 + r * 36}" width="20" height="22" rx="2"/>`).join('')).join('')}
  </g>
  <path d="M250 130 L365 78 L480 130 Z" fill="${sky}"/>
  <g fill="#2e5d3a">
    <path d="M60 300 l22 -64 l22 64 Z"/><path d="M690 300 l26 -76 l26 76 Z"/><path d="M640 300 l18 -52 l18 52 Z"/>
  </g>
  <text x="400" y="452" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#ffffff" opacity="0.95">${SCENES[id].name}</text>
</svg>`;
}

let count = 0;
for (const [id, cfg] of Object.entries(SCENES)) {
  ['a', 'b', 'c'].forEach((v, i) => {
    fs.writeFileSync(path.join(outDir, `${id}-${v}.svg`), scene(id, cfg.palettes[i], i));
    count += 1;
  });
}
console.log(`Da sinh ${count} anh SVG vao ${outDir}`);
