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

// ─────────────────────────── 2. STREAK 🔥 ───────────────────────────
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

// ─────────────────────────── 3. WEEKDAY ACTIVITY ───────────────────────────
function generateActivity() {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayFull = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const buckets = data.weekdayDistribution || [0,0,0,0,0,0,0];
  const total = buckets.reduce((s, v) => s + v, 0);
  const max = Math.max(1, ...buckets);

  const WIDTH = 540;
  const PAD = 24;
  const HEAD_H = 56;
  const ROW_H = 30;
  const ROWS = 7;
  const FOOT_H = 24;
  const HEIGHT = PAD + HEAD_H + ROWS * ROW_H + FOOT_H + PAD;

  const LABEL_W = 42;
  const COUNT_W = 96;
  const BAR_LEFT = PAD + LABEL_W;
  const BAR_AREA = WIDTH - PAD - LABEL_W - COUNT_W - PAD;
  const BAR_H = 14;

  const getLevel = (c) => {
    if (c === 0) return 0;
    const r = c / max;
    if (r <= 0.25) return 1;
    if (r <= 0.50) return 2;
    if (r <= 0.75) return 3;
    return 4;
  };

  // Find peak day for footer
  let peakIdx = 0;
  for (let i = 1; i < 7; i++) if (buckets[i] > buckets[peakIdx]) peakIdx = i;
  const peakPct = total > 0 ? (buckets[peakIdx] / total) * 100 : 0;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.title{fill:#1f2328;font-size:16px;font-weight:600}
.subtitle{fill:#656d76;font-size:11px}
.day-label{fill:#1f2328;font-size:12px;font-weight:600}
.count{fill:#656d76;font-size:11px}
.pct{fill:#1a7f37;font-size:11px;font-weight:600}
.foot{fill:#8b949e;font-size:10px}
.bar-bg{fill:#ebedf0}
.b0{fill:#ebedf0}.b1{fill:#9be9a8}.b2{fill:#40c463}.b3{fill:#30a14e}.b4{fill:#216e39}
@media (prefers-color-scheme: dark){
.title{fill:#e6edf3}.subtitle{fill:#8b949e}.day-label{fill:#e6edf3}
.count{fill:#8b949e}.pct{fill:#39d353}.foot{fill:#6e7681}.bar-bg{fill:#21262d}
.b0{fill:#21262d}.b1{fill:#0e4429}.b2{fill:#006d32}.b3{fill:#26a641}.b4{fill:#39d353}}
</style>`);

  // Header
  p.push(`<text x="${PAD}" y="${PAD + 14}" class="title">📅 Activity by Day of Week (EST)</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 32}" class="subtitle">${total.toLocaleString()} contributions in 2026 (commits, issues, PRs, reviews — includes private org repos)</text>`);

  // Rows
  let y = PAD + HEAD_H;
  for (let i = 0; i < 7; i++) {
    const cnt = buckets[i];
    const pct = total > 0 ? (cnt / total) * 100 : 0;
    const bw = max > 0 ? (cnt / max) * BAR_AREA : 0;
    const cy = y + BAR_H + 1;

    p.push(`<text x="${PAD + LABEL_W - 8}" y="${cy}" class="day-label" text-anchor="end">${dayNames[i]}</text>`);
    p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${BAR_AREA}" height="${BAR_H}" rx="3" class="bar-bg"/>`);
    if (bw > 0.5) {
      const lv = getLevel(cnt);
      p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${bw}" height="${BAR_H}" rx="3" class="b${lv}"><title>${dayFull[i]}: ${cnt} contribution${cnt === 1 ? '' : 's'} (${pct.toFixed(1)}%)</title></rect>`);
    }
    p.push(`<text x="${WIDTH - PAD - 40}" y="${cy}" class="count" text-anchor="end">${cnt}</text>`);
    p.push(`<text x="${WIDTH - PAD}" y="${cy}" class="pct" text-anchor="end">${pct.toFixed(1)}%</text>`);

    y += ROW_H;
  }

  // Footer
  const footY = y + 12;
  if (total > 0) {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">📈 Most active: <tspan class="pct">${dayFull[peakIdx]}</tspan> (${peakPct.toFixed(1)}% of all activity)</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">No activity yet in 2026.</text>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── WRITE ALL ───────────────────────────
const outputs = [
  ['calendar-2026.svg', generateCalendar()],
  ['streak.svg', generateStreak()],
  ['activity.svg', generateActivity()],
];

for (const [name, svg] of outputs) {
  const path = join(ASSETS, name);
  writeFileSync(path, svg, 'utf8');
  console.log(`Generated ${name} (${svg.length} bytes)`);
}
