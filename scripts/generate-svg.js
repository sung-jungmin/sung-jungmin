import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const data = JSON.parse(
  readFileSync(join(ROOT, 'data', 'contributions-2026.json'), 'utf8')
);

// ── Layout constants ──
const PAD = 30;
const CELL = 14;
const GAP = 3;
const STEP = CELL + GAP;
const LABEL_W = 44;
const COUNT_W = 60;
const DAYS = 31;
const HEADER_H = 56;
const DAY_HEADER_H = 18;
const ROW_H = STEP;
const FOOTER_H = 22;

const CAL_W = LABEL_W + DAYS * CELL + (DAYS - 1) * GAP;
const WIDTH = PAD + CAL_W + 8 + COUNT_W + PAD;
const HEIGHT = PAD + HEADER_H + DAY_HEADER_H + 12 * ROW_H + FOOTER_H + PAD;

function getLevel(c) {
  if (c === 0) return 0;
  if (c <= 3) return 1;
  if (c <= 7) return 2;
  if (c <= 15) return 3;
  return 4;
}

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch])
  );
}

function buildSvg() {
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">`
  );

  // Styles (theme-aware via prefers-color-scheme)
  parts.push(`<style>
    .title       { fill:#1f2328; font-size:18px; font-weight:600; }
    .subtitle    { fill:#1a7f37; font-size:13px; font-weight:600; }
    .muted       { fill:#656d76; font-size:11px; }
    .daynum      { fill:#afb8c1; font-size:9px; }
    .month-label { fill:#656d76; font-size:11px; font-weight:600; }
    .month-count { fill:#1a7f37; font-size:11px; font-weight:600; }
    .cell-0 { fill:#ebedf0; }
    .cell-1 { fill:#9be9a8; }
    .cell-2 { fill:#40c463; }
    .cell-3 { fill:#30a14e; }
    .cell-4 { fill:#216e39; }
    @media (prefers-color-scheme: dark) {
      .title       { fill:#e6edf3; }
      .subtitle    { fill:#39d353; }
      .muted       { fill:#8b949e; }
      .daynum      { fill:#484f58; }
      .month-label { fill:#8b949e; }
      .month-count { fill:#39d353; }
      .cell-0 { fill:#161b22; }
      .cell-1 { fill:#0e4429; }
      .cell-2 { fill:#006d32; }
      .cell-3 { fill:#26a641; }
      .cell-4 { fill:#39d353; }
    }
  </style>`);

  // Header
  parts.push(`<text x="${PAD}" y="${PAD + 18}" class="title">2026 Contribution Calendar</text>`);
  const totalStr = data.profile.totalContributions.toLocaleString();
  parts.push(
    `<text x="${PAD}" y="${PAD + 40}" class="subtitle">${escapeXml(totalStr)} contributions · @${escapeXml(data.profile.login)}</text>`
  );

  // Day-number header (1, 6, 11, 16, 21, 26, 31)
  const dayHdrY = PAD + HEADER_H + 11;
  for (let d = 1; d <= 31; d++) {
    if (d === 1 || d === 31 || d % 5 === 1) {
      const cx = PAD + LABEL_W + (d - 1) * STEP + CELL / 2;
      parts.push(`<text x="${cx}" y="${dayHdrY}" class="daynum" text-anchor="middle">${d}</text>`);
    }
  }

  // Month rows
  let rowTop = PAD + HEADER_H + DAY_HEADER_H;
  for (const month of data.months) {
    const labelY = rowTop + CELL - 3;

    // Month label
    parts.push(
      `<text x="${PAD + LABEL_W - 8}" y="${labelY}" class="month-label" text-anchor="end">${escapeXml(month.name)}</text>`
    );

    // Day cells
    let idx = 0;
    for (const day of month.days) {
      const lv = getLevel(day.count);
      const x = PAD + LABEL_W + idx * STEP;
      parts.push(`<rect x="${x}" y="${rowTop}" width="${CELL}" height="${CELL}" rx="2" class="cell-${lv}"/>`);
      idx++;
    }

    // Month count (only if > 0)
    if (month.totalContributions > 0) {
      const countX = PAD + LABEL_W + DAYS * STEP - GAP + 6;
      parts.push(
        `<text x="${countX}" y="${labelY}" class="month-count">${month.totalContributions}</text>`
      );
    }

    rowTop += ROW_H;
  }

  // Footer — display "Updated" date in Eastern Time (EST/EDT)
  const tz = data.meta.timezone || 'America/New_York';
  const updated = new Date(data.meta.generatedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: tz,
  });
  parts.push(
    `<text x="${PAD}" y="${HEIGHT - PAD + 4}" class="muted">↻ Updated ${escapeXml(updated)} (EST) · auto-refreshed daily</text>`
  );

  parts.push('</svg>');
  return parts.join('\n');
}

const svg = buildSvg();
const outDir = join(ROOT, 'assets');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'calendar-2026.svg');
writeFileSync(outPath, svg, 'utf8');
console.log(`Generated ${outPath} (${WIDTH}×${HEIGHT})`);
