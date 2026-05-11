import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const data = JSON.parse(
  readFileSync(join(ROOT, 'data', 'contributions-2026.json'), 'utf8')
);

const ASSETS = join(ROOT, 'assets');
mkdirSync(ASSETS, { recursive: true });

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function escapeXml(s) {
  return String(s).replace(/[<>&"']/g, (ch) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch])
  );
}

function fmtEstDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'America/New_York',
  });
}

// ─────────────────────────── 1. CALENDAR ───────────────────────────
function generateCalendar() {
  const PAD = 30, CELL = 14, GAP = 3, STEP = CELL + GAP;
  const LABEL_W = 44, COUNT_W = 60, DAYS = 31;
  const HEADER_H = 56, DAY_HEADER_H = 18, ROW_H = STEP, FOOTER_H = 22;
  const CAL_W = LABEL_W + DAYS * CELL + (DAYS - 1) * GAP;
  const WIDTH = PAD + CAL_W + 8 + COUNT_W + PAD;
  const HEIGHT = PAD + HEADER_H + DAY_HEADER_H + 12 * ROW_H + FOOTER_H + PAD;

  const getLevel = (c) => c === 0 ? 0 : c <= 3 ? 1 : c <= 7 ? 2 : c <= 15 ? 3 : 4;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.title{fill:#1f2328;font-size:18px;font-weight:600}
.subtitle{fill:#1a7f37;font-size:13px;font-weight:600}
.muted{fill:#656d76;font-size:11px}
.daynum{fill:#afb8c1;font-size:9px}
.month-label{fill:#656d76;font-size:11px;font-weight:600}
.month-count{fill:#1a7f37;font-size:11px;font-weight:600}
.c0{fill:#ebedf0}.c1{fill:#9be9a8}.c2{fill:#40c463}.c3{fill:#30a14e}.c4{fill:#216e39}
@media (prefers-color-scheme: dark){
.title{fill:#e6edf3}.subtitle{fill:#39d353}.muted{fill:#8b949e}.daynum{fill:#484f58}
.month-label{fill:#8b949e}.month-count{fill:#39d353}
.c0{fill:#161b22}.c1{fill:#0e4429}.c2{fill:#006d32}.c3{fill:#26a641}.c4{fill:#39d353}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 18}" class="title">2026 Contribution Calendar</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 40}" class="subtitle">${data.profile.totalContributions.toLocaleString()} contributions · @${escapeXml(data.profile.login)}</text>`);

  const dayHdrY = PAD + HEADER_H + 11;
  for (let d = 1; d <= 31; d++) {
    if (d === 1 || d === 31 || d % 5 === 1) {
      const cx = PAD + LABEL_W + (d - 1) * STEP + CELL / 2;
      p.push(`<text x="${cx}" y="${dayHdrY}" class="daynum" text-anchor="middle">${d}</text>`);
    }
  }

  let rowTop = PAD + HEADER_H + DAY_HEADER_H;
  for (const m of data.months) {
    const labelY = rowTop + CELL - 3;
    p.push(`<text x="${PAD + LABEL_W - 8}" y="${labelY}" class="month-label" text-anchor="end">${escapeXml(m.name)}</text>`);
    let idx = 0;
    for (const day of m.days) {
      const lv = getLevel(day.count);
      const x = PAD + LABEL_W + idx * STEP;
      p.push(`<rect x="${x}" y="${rowTop}" width="${CELL}" height="${CELL}" rx="2" class="c${lv}"/>`);
      idx++;
    }
    if (m.totalContributions > 0) {
      const cx = PAD + LABEL_W + DAYS * STEP - GAP + 6;
      p.push(`<text x="${cx}" y="${labelY}" class="month-count">${m.totalContributions}</text>`);
    }
    rowTop += ROW_H;
  }

  const updated = new Date(data.meta.generatedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    timeZone: data.meta.timezone || 'America/New_York',
  });
  p.push(`<text x="${PAD}" y="${HEIGHT - PAD + 4}" class="muted">↻ Updated ${escapeXml(updated)} (EST) · auto-refreshed daily</text>`);
  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 2. LANGUAGES ───────────────────────────
function generateLanguages() {
  const PAD = 24;
  const ROW_H = 24;
  const BAR_H = 10;
  const WIDTH = 540;
  const langs = (data.languages || []).slice(0, 8);
  const total = langs.reduce((s, l) => s + l.commits, 0);
  const HEAD_H = 70;
  const HEIGHT = PAD + HEAD_H + (langs.length || 1) * ROW_H + PAD;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.title{fill:#1f2328;font-size:16px;font-weight:600}
.subtitle{fill:#656d76;font-size:11px}
.lang-name{fill:#1f2328;font-size:12px;font-weight:600}
.lang-count{fill:#656d76;font-size:11px}
.lang-pct{fill:#1f2328;font-size:11px;font-weight:600}
.bar-bg{fill:#ebedf0}
@media (prefers-color-scheme: dark){
.title{fill:#e6edf3}.subtitle{fill:#8b949e}.lang-name{fill:#e6edf3}
.lang-count{fill:#8b949e}.lang-pct{fill:#e6edf3}.bar-bg{fill:#21262d}}
</style>`);

  // Header
  p.push(`<text x="${PAD}" y="${PAD + 14}" class="title">📊 Languages by Commits</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 32}" class="subtitle">${total.toLocaleString()} commits across ${langs.length} language${langs.length === 1 ? '' : 's'}</text>`);

  // Stacked bar
  const barY = PAD + 44;
  const barW = WIDTH - PAD * 2;
  p.push(`<rect x="${PAD}" y="${barY}" width="${barW}" height="${BAR_H}" rx="5" class="bar-bg"/>`);
  let cursor = 0;
  for (const l of langs) {
    const w = (l.percentage / 100) * barW;
    if (w > 0.5) {
      p.push(`<rect x="${PAD + cursor}" y="${barY}" width="${w}" height="${BAR_H}" rx="0" fill="${l.color}"/>`);
    }
    cursor += w;
  }

  // Rows
  if (langs.length === 0) {
    p.push(`<text x="${PAD}" y="${PAD + HEAD_H + 16}" class="subtitle">No language data yet — will populate after first workflow run.</text>`);
  } else {
    let rowY = PAD + HEAD_H;
    for (const l of langs) {
      const cy = rowY + 8;
      p.push(`<circle cx="${PAD + 6}" cy="${cy}" r="5" fill="${l.color}"/>`);
      p.push(`<text x="${PAD + 18}" y="${cy + 4}" class="lang-name">${escapeXml(l.name)}</text>`);
      p.push(`<text x="${WIDTH - PAD - 70}" y="${cy + 4}" class="lang-count" text-anchor="end">${l.commits} commit${l.commits === 1 ? '' : 's'}</text>`);
      p.push(`<text x="${WIDTH - PAD}" y="${cy + 4}" class="lang-pct" text-anchor="end">${l.percentage.toFixed(1)}%</text>`);
      rowY += ROW_H;
    }
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 3. STREAK 🔥 ───────────────────────────
function generateStreak() {
  const WIDTH = 540, HEIGHT = 200;
  const s = data.streak || { current: 0, longest: 0, currentStart: null, currentEnd: null, longestStart: null, longestEnd: null };

  const currentRange = s.currentStart && s.currentEnd
    ? (s.currentStart === s.currentEnd ? fmtEstDate(s.currentStart) : `${fmtEstDate(s.currentStart)} – ${fmtEstDate(s.currentEnd)}`)
    : '—';
  const longestRange = s.longestStart && s.longestEnd
    ? (s.longestStart === s.longestEnd ? fmtEstDate(s.longestStart) : `${fmtEstDate(s.longestStart)} – ${fmtEstDate(s.longestEnd)}`)
    : '—';

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<defs>
<radialGradient id="flameG" cx="50%" cy="65%" r="55%">
  <stop offset="0%" stop-color="#FFE066"/>
  <stop offset="40%" stop-color="#FF8C42"/>
  <stop offset="80%" stop-color="#E63946"/>
  <stop offset="100%" stop-color="#9D0208"/>
</radialGradient>
<radialGradient id="flameInner" cx="50%" cy="70%" r="40%">
  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9"/>
  <stop offset="60%" stop-color="#FFE066" stop-opacity="0.5"/>
  <stop offset="100%" stop-color="#FF8C42" stop-opacity="0"/>
</radialGradient>
</defs>`);
  p.push(`<style>
.label{fill:#656d76;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase}
.big{fill:#FF8C42;font-size:54px;font-weight:800}
.medium{fill:#1f2328;font-size:32px;font-weight:700}
.range{fill:#656d76;font-size:11px}
.divider{stroke:#d0d7de;stroke-width:1}
@media (prefers-color-scheme: dark){
.label{fill:#8b949e}.medium{fill:#e6edf3}.range{fill:#8b949e}.divider{stroke:#30363d}}
</style>`);

  // ── LEFT: Flame + Current Streak ──
  const cx = 100;
  // Flame shape (teardrop) with animation
  p.push(`<g transform="translate(${cx},90)">
  <path d="M 0,-50 C -25,-25 -38,-5 -38,15 C -38,40 -20,55 0,55 C 20,55 38,40 38,15 C 38,-5 25,-25 0,-50 Z"
        fill="url(#flameG)">
    <animateTransform attributeName="transform" type="scale"
      values="1,1;1.04,1.08;0.97,1.02;1.02,1.05;1,1"
      dur="1.4s" repeatCount="indefinite" additive="sum"/>
  </path>
  <path d="M 0,-22 C -14,-8 -20,5 -20,18 C -20,32 -10,42 0,42 C 10,42 20,32 20,18 C 20,5 14,-8 0,-22 Z"
        fill="url(#flameInner)">
    <animateTransform attributeName="transform" type="scale"
      values="1,1;0.92,1.1;1.05,0.98;0.95,1.05;1,1"
      dur="1s" repeatCount="indefinite" additive="sum"/>
  </path>
</g>`);

  // Current streak text
  p.push(`<text x="180" y="60" class="label">🔥 Current Streak</text>`);
  p.push(`<text x="180" y="115" class="big">${s.current}</text>`);
  p.push(`<text x="180" y="140" class="range">day${s.current === 1 ? '' : 's'} · ${escapeXml(currentRange)}</text>`);

  // Divider
  p.push(`<line x1="380" y1="40" x2="380" y2="160" class="divider"/>`);

  // ── RIGHT: Longest streak ──
  p.push(`<text x="405" y="60" class="label">⭐ Longest Streak</text>`);
  p.push(`<text x="405" y="115" class="medium">${s.longest}</text>`);
  p.push(`<text x="405" y="140" class="range">day${s.longest === 1 ? '' : 's'} · ${escapeXml(longestRange)}</text>`);

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 4. HEATMAP ───────────────────────────
function generateHeatmap() {
  const grid = data.heatmap || Array.from({ length: 7 }, () => Array(24).fill(0));
  const max = Math.max(1, ...grid.flat());

  const PAD = 24;
  const LABEL_W = 32;
  const CELL_W = 18, CELL_H = 18, GAP = 3;
  const HOURS = 24, ROWS = 7;
  const HEAD_H = 58;
  const HOUR_HDR_H = 14;
  const FOOT_H = 26;
  const WIDTH = PAD + LABEL_W + HOURS * CELL_W + (HOURS - 1) * GAP + PAD;
  const HEIGHT = PAD + HEAD_H + HOUR_HDR_H + ROWS * CELL_H + (ROWS - 1) * GAP + FOOT_H + PAD;

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getLevel = (c) => {
    if (c === 0) return 0;
    const ratio = c / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.50) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.title{fill:#1f2328;font-size:16px;font-weight:600}
.subtitle{fill:#656d76;font-size:11px}
.axis{fill:#8b949e;font-size:9px}
.day-label{fill:#656d76;font-size:11px;font-weight:600}
.foot{fill:#8b949e;font-size:10px}
.h0{fill:#ebedf0}.h1{fill:#9be9a8}.h2{fill:#40c463}.h3{fill:#30a14e}.h4{fill:#216e39}
@media (prefers-color-scheme: dark){
.title{fill:#e6edf3}.subtitle{fill:#8b949e}.axis{fill:#6e7681}.day-label{fill:#8b949e}.foot{fill:#6e7681}
.h0{fill:#161b22}.h1{fill:#0e4429}.h2{fill:#006d32}.h3{fill:#26a641}.h4{fill:#39d353}}
</style>`);

  // Header
  const totalCommits = grid.flat().reduce((s, v) => s + v, 0);
  p.push(`<text x="${PAD}" y="${PAD + 14}" class="title">⏰ When I commit · weekday × hour (EST)</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 32}" class="subtitle">${totalCommits} commit${totalCommits === 1 ? '' : 's'} bucketed by day-of-week and hour-of-day in Eastern Time</text>`);

  // Hour labels (show every 3 hours)
  const gridLeft = PAD + LABEL_W;
  const gridTop = PAD + HEAD_H + HOUR_HDR_H;
  for (let h = 0; h < HOURS; h += 3) {
    const x = gridLeft + h * (CELL_W + GAP) + CELL_W / 2;
    p.push(`<text x="${x}" y="${PAD + HEAD_H + 10}" class="axis" text-anchor="middle">${h}</text>`);
  }
  p.push(`<text x="${gridLeft + HOURS * (CELL_W + GAP) - CELL_W / 2 - GAP}" y="${PAD + HEAD_H + 10}" class="axis" text-anchor="middle">23</text>`);

  // Cells
  for (let r = 0; r < ROWS; r++) {
    const y = gridTop + r * (CELL_H + GAP);
    p.push(`<text x="${gridLeft - 8}" y="${y + CELL_H - 5}" class="day-label" text-anchor="end">${dayNames[r]}</text>`);
    for (let h = 0; h < HOURS; h++) {
      const x = gridLeft + h * (CELL_W + GAP);
      const v = grid[r][h];
      const lv = getLevel(v);
      p.push(`<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" rx="2" class="h${lv}"><title>${dayNames[r]} ${h}:00 — ${v} commit${v === 1 ? '' : 's'}</title></rect>`);
    }
  }

  // Footer legend
  const footY = gridTop + ROWS * (CELL_H + GAP) + 18;
  p.push(`<text x="${PAD}" y="${footY}" class="foot">Less</text>`);
  let lx = PAD + 32;
  for (let lv = 0; lv <= 4; lv++) {
    p.push(`<rect x="${lx}" y="${footY - 10}" width="12" height="12" rx="2" class="h${lv}"/>`);
    lx += 16;
  }
  p.push(`<text x="${lx + 2}" y="${footY}" class="foot">More</text>`);
  p.push(`<text x="${WIDTH - PAD}" y="${footY}" class="foot" text-anchor="end">peak: ${max} commit${max === 1 ? '' : 's'} in one hour</text>`);

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── WRITE ALL ───────────────────────────
const outputs = [
  ['calendar-2026.svg', generateCalendar()],
  ['languages.svg', generateLanguages()],
  ['streak.svg', generateStreak()],
  ['heatmap.svg', generateHeatmap()],
];

for (const [name, svg] of outputs) {
  const path = join(ASSETS, name);
  writeFileSync(path, svg, 'utf8');
  console.log(`Generated ${name} (${svg.length} bytes)`);
}
