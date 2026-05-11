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

function fmtDate(yyyymmdd) {
  if (!yyyymmdd) return '—';
  const [y, m, d] = yyyymmdd.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}

// ─────────────────────────── 0. STATS HERO ───────────────────────────
function generateStatsHero() {
  const WIDTH = 720, HEIGHT = 160;
  const total = data.profile.totalContributions || 0;
  const streak = data.streak ? data.streak.current : 0;
  const wd = data.weekdayDistribution || [0,0,0,0,0,0,0];
  let peakIdx = 0;
  for (let i = 1; i < 7; i++) if (wd[i] > wd[peakIdx]) peakIdx = i;
  const peakDay = wd[peakIdx] > 0 ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][peakIdx] : '—';
  const progress = data.yearProgress || 0;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.label{fill:#656d76;font-size:11px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase}
.num{fill:#1a7f37;font-size:42px;font-weight:800;letter-spacing:-1px}
.num-fire{fill:#FF8C42;font-size:42px;font-weight:800;letter-spacing:-1px}
.num-text{fill:#1f2328;font-size:32px;font-weight:700;letter-spacing:-0.5px}
.unit{fill:#656d76;font-size:11px}
.progress-label{fill:#1f2328;font-size:11px;font-weight:600}
.progress-pct{fill:#1a7f37;font-size:11px;font-weight:700}
.bar-bg{fill:#ebedf0}
.bar-fill{fill:#1a7f37}
.divider{stroke:#d0d7de;stroke-width:1}
@media (prefers-color-scheme: dark){
.label{fill:#8b949e}.num{fill:#39d353}.num-text{fill:#e6edf3}
.unit{fill:#8b949e}.progress-label{fill:#e6edf3}.progress-pct{fill:#39d353}
.bar-bg{fill:#21262d}.bar-fill{fill:#39d353}.divider{stroke:#30363d}}
</style>`);

  // 3 stat columns
  const cols = [
    { x: 60,  label: `${total.toLocaleString()} W's in 2026`, value: total.toLocaleString(), valueClass: 'num', unit: 'total contributions' },
    { x: 280, label: '🔥 on streak rn',      value: streak.toString(),       valueClass: 'num-fire', unit: streak === 1 ? 'day going' : 'days going' },
    { x: 500, label: '📅 peak grind day',    value: peakDay,                 valueClass: 'num-text', unit: peakDay === '—' ? 'no data yet' : 'most active' },
  ];
  for (const c of cols) {
    p.push(`<text x="${c.x}" y="40" class="label" text-anchor="middle">${escapeXml(c.label.toLowerCase())}</text>`);
    p.push(`<text x="${c.x}" y="85" class="${c.valueClass}" text-anchor="middle">${escapeXml(c.value)}</text>`);
    p.push(`<text x="${c.x}" y="105" class="unit" text-anchor="middle">${escapeXml(c.unit)}</text>`);
  }

  // Year progress bar
  const barX = 60, barY = 128, barW = WIDTH - 120, barH = 8;
  p.push(`<text x="${barX}" y="${barY - 6}" class="progress-label">📆 2026 progress</text>`);
  p.push(`<text x="${barX + barW}" y="${barY - 6}" class="progress-pct" text-anchor="end">${progress.toFixed(1)}% complete</text>`);
  p.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="4" class="bar-bg"/>`);
  p.push(`<rect x="${barX}" y="${barY}" width="${(progress/100) * barW}" height="${barH}" rx="4" class="bar-fill"/>`);

  p.push('</svg>');
  return p.join('\n');
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

  p.push(`<text x="${PAD}" y="${PAD + 18}" class="title">2026 · vertical lock-in 📅</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 40}" class="subtitle">${data.profile.totalContributions.toLocaleString()} W's · @${escapeXml(data.profile.login)}</text>`);

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
  p.push(`<text x="${PAD}" y="${HEIGHT - PAD + 4}" class="muted">↻ glow-up: ${escapeXml(updated)} (EST) · daily refresh fr</text>`);
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
  p.push(`<text x="180" y="60" class="label">🔥 on a streak rn</text>`);
  p.push(`<text x="180" y="115" class="big">${s.current}</text>`);
  p.push(`<text x="180" y="140" class="range">day${s.current === 1 ? '' : 's'} locked in · ${escapeXml(currentRange)}</text>`);

  // Divider
  p.push(`<line x1="380" y1="40" x2="380" y2="160" class="divider"/>`);

  // ── RIGHT: Longest streak ──
  p.push(`<text x="405" y="60" class="label">⭐ peak era</text>`);
  p.push(`<text x="405" y="115" class="medium">${s.longest}</text>`);
  p.push(`<text x="405" y="140" class="range">day${s.longest === 1 ? '' : 's'} of cooking · ${escapeXml(longestRange)}</text>`);

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
  p.push(`<text x="${PAD}" y="${PAD + 14}" class="title">📅 when i actually lock in · EST</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 32}" class="subtitle">${total.toLocaleString()} W's in 2026 · every contribution counted (private org repos too, no cap)</text>`);

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
    p.push(`<text x="${PAD}" y="${footY}" class="foot">📈 peak grind day: <tspan class="pct">${dayFull[peakIdx]}</tspan> · ${peakPct.toFixed(1)}% of the chaos</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">no activity yet 💀 it's giving 'just got started'</text>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 4. MONTHLY BAR CHART ───────────────────────────
function generateMonthly() {
  const months = data.months || [];
  const max = Math.max(1, ...months.map(m => m.totalContributions || 0));
  const total = months.reduce((s, m) => s + (m.totalContributions || 0), 0);

  const WIDTH = 540, PAD = 24;
  const HEAD_H = 56, ROW_H = 24, ROWS = 12, FOOT_H = 24;
  const HEIGHT = PAD + HEAD_H + ROWS * ROW_H + FOOT_H + PAD;

  const LABEL_W = 36;
  const COUNT_W = 56;
  const BAR_LEFT = PAD + LABEL_W;
  const BAR_AREA = WIDTH - PAD - LABEL_W - COUNT_W - PAD;
  const BAR_H = 12;

  const getLevel = (c) => {
    if (c === 0) return 0;
    const r = c / max;
    if (r <= 0.25) return 1;
    if (r <= 0.50) return 2;
    if (r <= 0.75) return 3;
    return 4;
  };

  // Find best month
  let bestIdx = 0;
  for (let i = 1; i < months.length; i++) {
    if ((months[i].totalContributions || 0) > (months[bestIdx].totalContributions || 0)) bestIdx = i;
  }

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.title{fill:#1f2328;font-size:16px;font-weight:600}
.subtitle{fill:#656d76;font-size:11px}
.month-label{fill:#1f2328;font-size:11px;font-weight:600}
.count{fill:#656d76;font-size:11px;font-weight:600}
.bar-bg{fill:#ebedf0}
.foot{fill:#8b949e;font-size:10px}
.pct{fill:#1a7f37;font-size:11px;font-weight:600}
.b0{fill:#ebedf0}.b1{fill:#9be9a8}.b2{fill:#40c463}.b3{fill:#30a14e}.b4{fill:#216e39}
@media (prefers-color-scheme: dark){
.title{fill:#e6edf3}.subtitle{fill:#8b949e}.month-label{fill:#e6edf3}.count{fill:#8b949e}
.bar-bg{fill:#21262d}.foot{fill:#6e7681}.pct{fill:#39d353}
.b0{fill:#21262d}.b1{fill:#0e4429}.b2{fill:#006d32}.b3{fill:#26a641}.b4{fill:#39d353}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 14}" class="title">📈 monthly grind chart</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 32}" class="subtitle">${total.toLocaleString()} W's spread across the year · the longer the bar, the harder i went</text>`);

  let y = PAD + HEAD_H;
  for (const m of months) {
    const cnt = m.totalContributions || 0;
    const bw = max > 0 ? (cnt / max) * BAR_AREA : 0;
    const lv = getLevel(cnt);
    const cy = y + BAR_H + 2;

    p.push(`<text x="${PAD + LABEL_W - 8}" y="${cy}" class="month-label" text-anchor="end">${escapeXml(m.name)}</text>`);
    p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${BAR_AREA}" height="${BAR_H}" rx="3" class="bar-bg"/>`);
    if (bw > 0.5) {
      p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${bw}" height="${BAR_H}" rx="3" class="b${lv}"><title>${escapeXml(m.name)}: ${cnt} contributions</title></rect>`);
    }
    p.push(`<text x="${WIDTH - PAD}" y="${cy}" class="count" text-anchor="end">${cnt > 0 ? cnt : ''}</text>`);

    y += ROW_H;
  }

  // Footer — best month callout
  if (total > 0 && months[bestIdx]) {
    p.push(`<text x="${PAD}" y="${y + 12}" class="foot">🏆 cooked the hardest in <tspan class="pct">${escapeXml(months[bestIdx].name)}</tspan> · ${months[bestIdx].totalContributions} contributions</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${y + 12}" class="foot">no monthly data yet 💀</text>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 5. PERSONAL BESTS ───────────────────────────
function generateBests() {
  const WIDTH = 720, HEIGHT = 130;
  const b = data.bests || {};
  const s = data.streak || { longest: 0, longestStart: null, longestEnd: null };

  const cards = [
    {
      icon: '🏆',
      label: 'best day',
      value: b.bestDay ? `${b.bestDay.count}` : '—',
      unit: b.bestDay ? `W's on ${fmtDate(b.bestDay.date)}` : 'no data yet',
    },
    {
      icon: '📅',
      label: 'best month',
      value: b.bestMonth ? `${b.bestMonth.count}` : '—',
      unit: b.bestMonth ? `in ${b.bestMonth.name}` : 'no data yet',
    },
    {
      icon: '🔥',
      label: 'streak',
      value: `${s.longest || 0}`,
      unit: (() => {
        if (s.longest === 0 && (s.current || 0) === 0) return 'no streak yet';
        const maxLabel = `day${s.longest === 1 ? '' : 's'} max`;
        if ((s.current || 0) > 0) {
          return `${maxLabel} · 🔥 ${s.current} active rn`;
        }
        return `${maxLabel} · cooling off`;
      })(),
    },
    {
      icon: '🚀',
      label: 'first activity',
      value: b.firstActivity ? fmtDate(b.firstActivity.date) : '—',
      unit: b.firstActivity ? `kicked off 2026` : 'not started',
    },
  ];

  const COLS = 4;
  const GAP = 12;
  const PAD = 16;
  const CARD_W = (WIDTH - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const CARD_H = HEIGHT - PAD * 2;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT}">`);
  p.push(`<style>
.card{fill:#f6f8fa;stroke:#d0d7de;stroke-width:1}
.card-icon{font-size:18px}
.card-label{fill:#656d76;font-size:10px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase}
.card-value{fill:#1f2328;font-size:24px;font-weight:800;letter-spacing:-0.5px}
.card-unit{fill:#656d76;font-size:10px}
@media (prefers-color-scheme: dark){
.card{fill:#161b22;stroke:#30363d}.card-label{fill:#8b949e}.card-value{fill:#e6edf3}.card-unit{fill:#8b949e}}
</style>`);

  for (let i = 0; i < COLS; i++) {
    const c = cards[i];
    const x = PAD + i * (CARD_W + GAP);
    p.push(`<rect x="${x}" y="${PAD}" width="${CARD_W}" height="${CARD_H}" rx="10" class="card"/>`);
    p.push(`<text x="${x + 14}" y="${PAD + 28}" class="card-icon">${c.icon}</text>`);
    p.push(`<text x="${x + 40}" y="${PAD + 28}" class="card-label">${escapeXml(c.label)}</text>`);
    p.push(`<text x="${x + 14}" y="${PAD + 62}" class="card-value">${escapeXml(c.value)}</text>`);
    p.push(`<text x="${x + 14}" y="${PAD + 82}" class="card-unit">${escapeXml(c.unit)}</text>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── WRITE ALL ───────────────────────────
const outputs = [
  ['stats-hero.svg', generateStatsHero()],
  ['calendar-2026.svg', generateCalendar()],
  ['monthly.svg', generateMonthly()],
  ['activity.svg', generateActivity()],
  ['bests.svg', generateBests()],
];

for (const [name, svg] of outputs) {
  const path = join(ASSETS, name);
  writeFileSync(path, svg, 'utf8');
  console.log(`Generated ${name} (${svg.length} bytes)`);
}
