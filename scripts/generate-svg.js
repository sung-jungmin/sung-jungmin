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

// ─── Typography stacks (Anthropic-style: Tiempos serif + Styrene sans) ───
const FONT_SANS = "'Styrene B', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const FONT_SERIF = "'Tiempos Headline', 'Source Serif Pro', Georgia, 'Times New Roman', serif";

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

// ─── Anthropic-inspired palette tokens (referenced in each <style> block) ───
// Light: cream paper backgrounds, warm slate text, Claude coral accent
// Dark:  warm umber backgrounds, cream text, lifted coral

// ─────────────────────────── 0. STATS HERO ───────────────────────────
function generateStatsHero() {
  const WIDTH = 720, HEIGHT = 170;
  const total = data.profile.totalContributions || 0;
  const streak = data.streak ? data.streak.current : 0;
  const wd = data.weekdayDistribution || [0,0,0,0,0,0,0];
  let peakIdx = 0;
  for (let i = 1; i < 7; i++) if (wd[i] > wd[peakIdx]) peakIdx = i;
  const peakDay = wd[peakIdx] > 0 ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][peakIdx] : '—';
  const progress = data.yearProgress || 0;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.label{fill:#5A574E;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
.num{fill:#CC785C;font-size:48px;font-weight:400;letter-spacing:-2px;font-family:${FONT_SERIF}}
.num-text{fill:#181818;font-size:34px;font-weight:400;letter-spacing:-0.5px;font-family:${FONT_SERIF}}
.unit{fill:#5A574E;font-size:11px}
.progress-label{fill:#181818;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase}
.progress-pct{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.bar-bg{fill:#E0DCC9}
.bar-fill{fill:#CC785C}
@media (prefers-color-scheme: dark){
.label{fill:#A19E92}
.num{fill:#E5947A}
.num-text{fill:#F0EEE6}
.unit{fill:#A19E92}
.progress-label{fill:#F0EEE6}
.progress-pct{fill:#E5947A}
.bar-bg{fill:#3D3A33}
.bar-fill{fill:#E5947A}
}
</style>`);

  const cols = [
    { x: 60,  label: 'total contributions',    value: total.toLocaleString(), valueClass: 'num',       unit: `W's in 2026 so far` },
    { x: 280, label: 'on streak rn',           value: streak.toString(),       valueClass: 'num',       unit: streak === 1 ? 'day going' : 'days going' },
    { x: 500, label: 'peak grind day',         value: peakDay,                 valueClass: 'num-text',  unit: peakDay === '—' ? 'no data yet' : 'most active weekday' },
  ];
  for (const c of cols) {
    p.push(`<text x="${c.x}" y="42" class="label" text-anchor="middle">${escapeXml(c.label)}</text>`);
    p.push(`<text x="${c.x}" y="92" class="${c.valueClass}" text-anchor="middle">${escapeXml(c.value)}</text>`);
    p.push(`<text x="${c.x}" y="112" class="unit" text-anchor="middle">${escapeXml(c.unit)}</text>`);
  }

  const barX = 60, barY = 138, barW = WIDTH - 120, barH = 6;
  p.push(`<text x="${barX}" y="${barY - 6}" class="progress-label">2026 progress</text>`);
  p.push(`<text x="${barX + barW}" y="${barY - 6}" class="progress-pct" text-anchor="end">${progress.toFixed(1)}%</text>`);
  p.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="3" class="bar-bg"/>`);
  p.push(`<rect x="${barX}" y="${barY}" width="${(progress/100) * barW}" height="${barH}" rx="3" class="bar-fill"/>`);

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 1. CALENDAR ───────────────────────────
function generateCalendar() {
  const PAD = 32, CELL = 14, GAP = 3, STEP = CELL + GAP;
  const LABEL_W = 44, COUNT_W = 60, DAYS = 31;
  const HEADER_H = 60, DAY_HEADER_H = 18, ROW_H = STEP, FOOTER_H = 22;
  const CAL_W = LABEL_W + DAYS * CELL + (DAYS - 1) * GAP;
  const WIDTH = PAD + CAL_W + 8 + COUNT_W + PAD;
  const HEIGHT = PAD + HEADER_H + DAY_HEADER_H + 12 * ROW_H + FOOTER_H + PAD;

  const getLevel = (c) => c === 0 ? 0 : c <= 3 ? 1 : c <= 7 ? 2 : c <= 15 ? 3 : 4;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.title{fill:#181818;font-size:20px;font-weight:400;font-family:${FONT_SERIF};letter-spacing:-0.5px}
.subtitle{fill:#CC785C;font-size:13px;font-weight:600}
.muted{fill:#5A574E;font-size:10px}
.daynum{fill:#A19E92;font-size:9px}
.month-label{fill:#5A574E;font-size:11px;font-weight:600}
.month-count{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.c0{fill:#EEE9DC}.c1{fill:#F0D5B4}.c2{fill:#E5B388}.c3{fill:#CC785C}.c4{fill:#A85A3F}
@media (prefers-color-scheme: dark){
.title{fill:#F0EEE6}.subtitle{fill:#E5947A}.muted{fill:#A19E92}.daynum{fill:#5A574E}
.month-label{fill:#A19E92}.month-count{fill:#E5947A}
.c0{fill:#26241F}.c1{fill:#3D2E22}.c2{fill:#7A4A33}.c3{fill:#CC785C}.c4{fill:#E5947A}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 20}" class="title">2026 · vertical lock-in</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 42}" class="subtitle">${data.profile.totalContributions.toLocaleString()} W's · @${escapeXml(data.profile.login)}</text>`);

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
  p.push(`<text x="${PAD}" y="${HEIGHT - PAD + 4}" class="muted">↻ refreshed ${escapeXml(updated)} (EST) · daily glow-up</text>`);
  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 2. MONTHLY BAR CHART ───────────────────────────
function generateMonthly() {
  const months = data.months || [];
  const max = Math.max(1, ...months.map(m => m.totalContributions || 0));
  const total = months.reduce((s, m) => s + (m.totalContributions || 0), 0);

  const WIDTH = 540, PAD = 32;
  const HEAD_H = 60, ROW_H = 24, ROWS = 12, FOOT_H = 24;
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

  let bestIdx = 0;
  for (let i = 1; i < months.length; i++) {
    if ((months[i].totalContributions || 0) > (months[bestIdx].totalContributions || 0)) bestIdx = i;
  }

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.title{fill:#181818;font-size:18px;font-weight:400;font-family:${FONT_SERIF};letter-spacing:-0.3px}
.subtitle{fill:#5A574E;font-size:11px}
.month-label{fill:#181818;font-size:11px;font-weight:600}
.count{fill:#5A574E;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.bar-bg{fill:#EEE9DC}
.foot{fill:#A19E92;font-size:10px}
.pct{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.b0{fill:#EEE9DC}.b1{fill:#F0D5B4}.b2{fill:#E5B388}.b3{fill:#CC785C}.b4{fill:#A85A3F}
@media (prefers-color-scheme: dark){
.title{fill:#F0EEE6}.subtitle{fill:#A19E92}.month-label{fill:#F0EEE6}.count{fill:#A19E92}
.bar-bg{fill:#33312B}.foot{fill:#A19E92}.pct{fill:#E5947A}
.b0{fill:#33312B}.b1{fill:#3D2E22}.b2{fill:#7A4A33}.b3{fill:#CC785C}.b4{fill:#E5947A}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 16}" class="title">monthly grind chart</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 36}" class="subtitle">${total.toLocaleString()} W's spread across the year · the longer the bar, the harder i went</text>`);

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

  if (total > 0 && months[bestIdx]) {
    p.push(`<text x="${PAD}" y="${y + 12}" class="foot">🏆 cooked the hardest in <tspan class="pct">${escapeXml(months[bestIdx].name)}</tspan> · ${months[bestIdx].totalContributions} contributions</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${y + 12}" class="foot">no monthly data yet</text>`);
  }

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
  const PAD = 32;
  const HEAD_H = 60;
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

  let peakIdx = 0;
  for (let i = 1; i < 7; i++) if (buckets[i] > buckets[peakIdx]) peakIdx = i;
  const peakPct = total > 0 ? (buckets[peakIdx] / total) * 100 : 0;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.title{fill:#181818;font-size:18px;font-weight:400;font-family:${FONT_SERIF};letter-spacing:-0.3px}
.subtitle{fill:#5A574E;font-size:11px}
.day-label{fill:#181818;font-size:12px;font-weight:600}
.count{fill:#5A574E;font-size:11px}
.pct{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.foot{fill:#A19E92;font-size:10px}
.bar-bg{fill:#EEE9DC}
.b0{fill:#EEE9DC}.b1{fill:#F0D5B4}.b2{fill:#E5B388}.b3{fill:#CC785C}.b4{fill:#A85A3F}
@media (prefers-color-scheme: dark){
.title{fill:#F0EEE6}.subtitle{fill:#A19E92}.day-label{fill:#F0EEE6}
.count{fill:#A19E92}.pct{fill:#E5947A}.foot{fill:#A19E92}.bar-bg{fill:#33312B}
.b0{fill:#33312B}.b1{fill:#3D2E22}.b2{fill:#7A4A33}.b3{fill:#CC785C}.b4{fill:#E5947A}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 16}" class="title">when i actually lock in · EST</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 36}" class="subtitle">${total.toLocaleString()} W's in 2026 · every contribution counted (private org repos too, no cap)</text>`);

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

  const footY = y + 12;
  if (total > 0) {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">peak grind day: <tspan class="pct">${dayFull[peakIdx]}</tspan> · ${peakPct.toFixed(1)}% of the chaos</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">no activity yet · just got started</text>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 4. PERSONAL BESTS ───────────────────────────
function generateBests() {
  const WIDTH = 720, HEIGHT = 140;
  const b = data.bests || {};
  const s = data.streak || { longest: 0, current: 0, longestStart: null, longestEnd: null };

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
  const GAP = 14;
  const PAD = 18;
  const CARD_W = (WIDTH - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const CARD_H = HEIGHT - PAD * 2;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.card{fill:#FAF9F5;stroke:#E0DCC9;stroke-width:1}
.card-icon{font-size:18px}
.card-label{fill:#5A574E;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase}
.card-value{fill:#181818;font-size:30px;font-weight:400;letter-spacing:-1px;font-family:${FONT_SERIF}}
.card-value-coral{fill:#CC785C;font-size:30px;font-weight:400;letter-spacing:-1px;font-family:${FONT_SERIF}}
.card-unit{fill:#5A574E;font-size:10px}
@media (prefers-color-scheme: dark){
.card{fill:#26241F;stroke:#3D3A33}
.card-label{fill:#A19E92}.card-value{fill:#F0EEE6}.card-value-coral{fill:#E5947A}.card-unit{fill:#A19E92}}
</style>`);

  for (let i = 0; i < COLS; i++) {
    const c = cards[i];
    const x = PAD + i * (CARD_W + GAP);
    const valueClass = (c.icon === '🔥') ? 'card-value-coral' : 'card-value';
    p.push(`<rect x="${x}" y="${PAD}" width="${CARD_W}" height="${CARD_H}" rx="12" class="card"/>`);
    p.push(`<text x="${x + 16}" y="${PAD + 30}" class="card-icon">${c.icon}</text>`);
    p.push(`<text x="${x + 44}" y="${PAD + 30}" class="card-label">${escapeXml(c.label)}</text>`);
    p.push(`<text x="${x + 16}" y="${PAD + 72}" class="${valueClass}">${escapeXml(c.value)}</text>`);
    p.push(`<text x="${x + 16}" y="${PAD + 92}" class="card-unit">${escapeXml(c.unit)}</text>`);
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
