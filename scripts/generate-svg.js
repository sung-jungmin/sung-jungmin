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

function fmtDate(yyyymmdd) {
  if (!yyyymmdd) return '—';
  const [, m, d] = yyyymmdd.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(d,10)}`;
}

function currentMonthEst() {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'numeric' });
  return parseInt(fmt.format(new Date()), 10);
}

const CUR_MONTH = currentMonthEst();

// ─── Anthropic-inspired palette tokens (referenced in each <style> block) ───
// Light: cream paper backgrounds, warm slate text, Claude coral accent
// Dark:  warm umber backgrounds, cream text, lifted coral

// ─────────────────────────── 0. STATS HERO ───────────────────────────
function generateStatsHero() {
  const WIDTH = 720, HEIGHT = 184;
  const total = data.profile.totalContributions || 0;
  const streak = data.streak ? data.streak.current : 0;
  const wd = data.weekdayDistribution || [0,0,0,0,0,0,0];
  let peakIdx = 0;
  for (let i = 1; i < 7; i++) if (wd[i] > wd[peakIdx]) peakIdx = i;
  const peakDay = wd[peakIdx] > 0 ? ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][peakIdx] : '—';
  const progress = data.yearProgress || 0;
  const pace = progress > 0 ? Math.round(total / (progress / 100)) : 0;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.label{fill:#5A574E;font-size:10px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase}
.num{fill:#181818;font-size:52px;font-weight:400;letter-spacing:-2px;font-family:${FONT_SERIF}}
.num-coral{fill:#CC785C;font-size:52px;font-weight:400;letter-spacing:-2px;font-family:${FONT_SERIF}}
.num-text{fill:#181818;font-size:36px;font-weight:400;letter-spacing:-0.5px;font-family:${FONT_SERIF}}
.unit{fill:#5A574E;font-size:11px}
.divider{stroke:#E0DCC9;stroke-width:1}
.progress-label{fill:#181818;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase}
.progress-meta{fill:#5A574E;font-size:11px}
.progress-pct{fill:#CC785C;font-size:12px;font-weight:700;font-family:${FONT_SERIF}}
.bar-bg{fill:#E0DCC9}
.bar-fill{fill:#CC785C}
.tick{stroke:#C9C2AB;stroke-width:1}
.pulse{animation:pulse 2.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion: reduce){.pulse{animation:none}}
@media (prefers-color-scheme: dark){
.label{fill:#A19E92}.num{fill:#F0EEE6}.num-coral{fill:#E5947A}.num-text{fill:#F0EEE6}
.unit{fill:#A19E92}.divider{stroke:#3D3A33}
.progress-label{fill:#F0EEE6}.progress-meta{fill:#A19E92}.progress-pct{fill:#E5947A}
.bar-bg{fill:#3D3A33}.bar-fill{fill:#E5947A}.tick{stroke:#4D4A40}
}
</style>`);

  // 3-column layout with subtle dividers between
  const cols = [
    { x: 60,  label: 'total contributions',  value: total.toLocaleString(), valueClass: 'num',       unit: `W's in 2026 so far` },
    { x: 280, label: 'on streak rn',         value: streak.toString(),       valueClass: 'num-coral', unit: streak === 0 ? 'go touch grass' : streak === 1 ? 'day going' : 'days going', pulse: streak > 0 },
    { x: 500, label: 'peak grind day',       value: peakDay,                 valueClass: 'num-text',  unit: peakDay === '—' ? 'no data yet' : 'most active weekday' },
  ];
  // Vertical dividers
  p.push(`<line x1="170" y1="34" x2="170" y2="118" class="divider"/>`);
  p.push(`<line x1="390" y1="34" x2="390" y2="118" class="divider"/>`);

  for (const c of cols) {
    p.push(`<text x="${c.x}" y="46" class="label" text-anchor="middle">${escapeXml(c.label)}</text>`);
    if (c.pulse) {
      p.push(`<text x="${c.x}" y="96" class="${c.valueClass} pulse" text-anchor="middle">${escapeXml(c.value)}</text>`);
    } else {
      p.push(`<text x="${c.x}" y="96" class="${c.valueClass}" text-anchor="middle">${escapeXml(c.value)}</text>`);
    }
    p.push(`<text x="${c.x}" y="116" class="unit" text-anchor="middle">${escapeXml(c.unit)}</text>`);
  }

  // Horizontal hairline before progress bar
  const barX = 60, barW = WIDTH - 120;
  p.push(`<line x1="${barX}" y1="134" x2="${barX + barW}" y2="134" class="divider"/>`);

  const barY = 156, barH = 8;
  p.push(`<text x="${barX}" y="${barY - 6}" class="progress-label">2026 progress</text>`);
  p.push(`<text x="${barX + barW}" y="${barY - 6}" class="progress-pct" text-anchor="end">${progress.toFixed(1)}%</text>`);
  if (pace > 0) {
    p.push(`<text x="${barX + barW / 2}" y="${barY - 6}" class="progress-meta" text-anchor="middle">on pace for ~${pace.toLocaleString()} by EOY</text>`);
  }
  p.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="4" class="bar-bg"/>`);
  p.push(`<rect x="${barX}" y="${barY}" width="${(progress/100) * barW}" height="${barH}" rx="4" class="bar-fill"/>`);
  // Quarter ticks
  for (let q = 1; q <= 3; q++) {
    const tx = barX + (q / 4) * barW;
    p.push(`<line x1="${tx}" y1="${barY + barH + 2}" x2="${tx}" y2="${barY + barH + 6}" class="tick"/>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 1. CALENDAR ───────────────────────────
function generateCalendar() {
  const PAD = 32, CELL = 14, GAP = 3, STEP = CELL + GAP;
  const LABEL_W = 44, COUNT_W = 64, DAYS = 31;
  const HEADER_H = 60, DAY_HEADER_H = 18, ROW_H = STEP, LEGEND_H = 26, FOOTER_H = 22;
  const CAL_W = LABEL_W + DAYS * CELL + (DAYS - 1) * GAP;
  const WIDTH = PAD + CAL_W + 8 + COUNT_W + PAD;
  const HEIGHT = PAD + HEADER_H + DAY_HEADER_H + 12 * ROW_H + LEGEND_H + FOOTER_H + PAD;

  const getLevel = (c) => c === 0 ? 0 : c <= 3 ? 1 : c <= 7 ? 2 : c <= 15 ? 3 : 4;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.title{fill:#181818;font-size:22px;font-weight:400;font-family:${FONT_SERIF};letter-spacing:-0.5px}
.subtitle{fill:#CC785C;font-size:12px;font-weight:600;letter-spacing:0.3px}
.muted{fill:#A19E92;font-size:10px}
.daynum{fill:#A19E92;font-size:9px}
.month-label{fill:#5A574E;font-size:11px;font-weight:600}
.month-label-cur{fill:#CC785C;font-size:11px;font-weight:700}
.month-count{fill:#181818;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.legend-label{fill:#5A574E;font-size:10px}
.current-ring{fill:none;stroke:#CC785C;stroke-width:1.4}
.c0{fill:#EEE9DC}.c1{fill:#F0D5B4}.c2{fill:#E5B388}.c3{fill:#CC785C}.c4{fill:#A85A3F}
@media (prefers-color-scheme: dark){
.title{fill:#F0EEE6}.subtitle{fill:#E5947A}.muted{fill:#5A574E}.daynum{fill:#5A574E}
.month-label{fill:#A19E92}.month-label-cur{fill:#E5947A}.month-count{fill:#F0EEE6}
.legend-label{fill:#A19E92}.current-ring{stroke:#E5947A}
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
    const isCur = m.month === CUR_MONTH;
    const labelY = rowTop + CELL - 3;
    const labelClass = isCur ? 'month-label-cur' : 'month-label';
    const labelText = isCur ? `▸ ${escapeXml(m.name)}` : escapeXml(m.name);
    p.push(`<text x="${PAD + LABEL_W - 8}" y="${labelY}" class="${labelClass}" text-anchor="end">${labelText}</text>`);
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

  // Legend
  const legendY = rowTop + 10;
  const legendStart = PAD + LABEL_W;
  p.push(`<text x="${legendStart}" y="${legendY + 11}" class="legend-label">less</text>`);
  for (let i = 0; i < 5; i++) {
    const lx = legendStart + 32 + i * (CELL + 4);
    p.push(`<rect x="${lx}" y="${legendY + 2}" width="${CELL}" height="${CELL}" rx="2" class="c${i}"/>`);
  }
  p.push(`<text x="${legendStart + 32 + 5 * (CELL + 4) + 4}" y="${legendY + 11}" class="legend-label">more</text>`);

  const updated = new Date(data.meta.generatedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    timeZone: data.meta.timezone || 'America/New_York',
  });
  p.push(`<text x="${WIDTH - PAD}" y="${legendY + 11}" class="muted" text-anchor="end">↻ refreshed ${escapeXml(updated)} (EST)</text>`);
  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 2. MONTHLY BAR CHART ───────────────────────────
function generateMonthly() {
  const months = data.months || [];
  const max = Math.max(1, ...months.map(m => m.totalContributions || 0));
  const total = months.reduce((s, m) => s + (m.totalContributions || 0), 0);

  const WIDTH = 540, PAD = 32;
  const HEAD_H = 60, ROW_H = 26, ROWS = 12, FOOT_H = 28;
  const HEIGHT = PAD + HEAD_H + ROWS * ROW_H + FOOT_H + PAD;

  const LABEL_W = 38;
  const COUNT_W = 56;
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

  let bestIdx = 0;
  for (let i = 1; i < months.length; i++) {
    if ((months[i].totalContributions || 0) > (months[bestIdx].totalContributions || 0)) bestIdx = i;
  }

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" font-family="${FONT_SANS}">`);
  p.push(`<style>
.title{fill:#181818;font-size:18px;font-weight:400;font-family:${FONT_SERIF};letter-spacing:-0.3px}
.subtitle{fill:#5A574E;font-size:11px}
.month-label{fill:#5A574E;font-size:11px;font-weight:600}
.month-label-cur{fill:#CC785C;font-size:11px;font-weight:700}
.count{fill:#181818;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.bar-bg{fill:#EEE9DC}
.gridline{stroke:#E0DCC9;stroke-width:1;stroke-dasharray:2 3}
.foot{fill:#5A574E;font-size:10px}
.pct{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.best-ring{fill:none;stroke:#CC785C;stroke-width:1.4}
.b0{fill:#EEE9DC}.b1{fill:#F0D5B4}.b2{fill:#E5B388}.b3{fill:#CC785C}.b4{fill:#A85A3F}
@media (prefers-color-scheme: dark){
.title{fill:#F0EEE6}.subtitle{fill:#A19E92}.month-label{fill:#A19E92}.month-label-cur{fill:#E5947A}
.count{fill:#F0EEE6}.bar-bg{fill:#33312B}.gridline{stroke:#3D3A33}
.foot{fill:#A19E92}.pct{fill:#E5947A}.best-ring{stroke:#E5947A}
.b0{fill:#33312B}.b1{fill:#3D2E22}.b2{fill:#7A4A33}.b3{fill:#CC785C}.b4{fill:#E5947A}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 16}" class="title">monthly grind chart</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 36}" class="subtitle">${total.toLocaleString()} W's across the year · longer bar = harder i went</text>`);

  // Vertical gridlines at 25%, 50%, 75%, 100%
  const gridTop = PAD + HEAD_H - 4;
  const gridBot = PAD + HEAD_H + ROWS * ROW_H + 2;
  for (let q = 1; q <= 4; q++) {
    const gx = BAR_LEFT + (q / 4) * BAR_AREA;
    p.push(`<line x1="${gx}" y1="${gridTop}" x2="${gx}" y2="${gridBot}" class="gridline"/>`);
  }

  let y = PAD + HEAD_H;
  let bestY = 0, bestBw = 0;
  months.forEach((m, i) => {
    const cnt = m.totalContributions || 0;
    const bw = max > 0 ? (cnt / max) * BAR_AREA : 0;
    const lv = getLevel(cnt);
    const isCur = m.month === CUR_MONTH;
    const cy = y + BAR_H + 2;
    const lblClass = isCur ? 'month-label-cur' : 'month-label';
    const lblText = isCur ? `▸ ${escapeXml(m.name)}` : escapeXml(m.name);

    p.push(`<text x="${PAD + LABEL_W - 8}" y="${cy}" class="${lblClass}" text-anchor="end">${lblText}</text>`);
    p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${BAR_AREA}" height="${BAR_H}" rx="3" class="bar-bg"/>`);
    if (bw > 0.5) {
      p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${bw}" height="${BAR_H}" rx="3" class="b${lv}"><title>${escapeXml(m.name)}: ${cnt} contributions</title></rect>`);
    }
    if (i === bestIdx && cnt > 0) {
      bestY = y + 4;
      bestBw = bw;
    }
    p.push(`<text x="${WIDTH - PAD}" y="${cy}" class="count" text-anchor="end">${cnt > 0 ? cnt : ''}</text>`);

    y += ROW_H;
  });

  if (bestBw > 0.5) {
    p.push(`<rect x="${BAR_LEFT - 1.5}" y="${bestY - 1.5}" width="${bestBw + 3}" height="${BAR_H + 3}" rx="4" class="best-ring"/>`);
  }

  if (total > 0 && months[bestIdx]) {
    p.push(`<text x="${PAD}" y="${y + 18}" class="foot">🏆 cooked the hardest in <tspan class="pct">${escapeXml(months[bestIdx].name)}</tspan> · ${months[bestIdx].totalContributions} contributions</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${y + 18}" class="foot">no monthly data yet</text>`);
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
  const ROW_H = 32;
  const ROWS = 7;
  const FOOT_H = 28;
  const HEIGHT = PAD + HEAD_H + ROWS * ROW_H + FOOT_H + PAD;

  const LABEL_W = 42;
  const COUNT_W = 96;
  const BAR_LEFT = PAD + LABEL_W;
  const BAR_AREA = WIDTH - PAD - LABEL_W - COUNT_W - PAD;
  const BAR_H = 16;

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
.day-label{fill:#5A574E;font-size:12px;font-weight:600}
.day-label-peak{fill:#CC785C;font-size:12px;font-weight:700}
.count{fill:#5A574E;font-size:11px}
.pct{fill:#181818;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.pct-peak{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.foot{fill:#5A574E;font-size:10px}
.foot-accent{fill:#CC785C;font-size:11px;font-weight:700;font-family:${FONT_SERIF}}
.bar-bg{fill:#EEE9DC}
.avg-line{stroke:#A19E92;stroke-width:1;stroke-dasharray:3 3}
.peak-ring{fill:none;stroke:#CC785C;stroke-width:1.4}
.b0{fill:#EEE9DC}.b1{fill:#F0D5B4}.b2{fill:#E5B388}.b3{fill:#CC785C}.b4{fill:#A85A3F}
@media (prefers-color-scheme: dark){
.title{fill:#F0EEE6}.subtitle{fill:#A19E92}.day-label{fill:#A19E92}.day-label-peak{fill:#E5947A}
.count{fill:#A19E92}.pct{fill:#F0EEE6}.pct-peak{fill:#E5947A}
.foot{fill:#A19E92}.foot-accent{fill:#E5947A}.bar-bg{fill:#33312B}
.avg-line{stroke:#5A574E}.peak-ring{stroke:#E5947A}
.b0{fill:#33312B}.b1{fill:#3D2E22}.b2{fill:#7A4A33}.b3{fill:#CC785C}.b4{fill:#E5947A}}
</style>`);

  p.push(`<text x="${PAD}" y="${PAD + 16}" class="title">when i actually lock in · EST</text>`);
  p.push(`<text x="${PAD}" y="${PAD + 36}" class="subtitle">${total.toLocaleString()} W's in 2026 · all contributions counted (private org repos too, no cap)</text>`);

  // Uniform-distribution reference line at 14.3% (1/7)
  const uniformX = BAR_LEFT + (1 / 7) * (total / max > 0 ? BAR_AREA * (total / 7 / max) / (total / 7 / max) : 0);
  // Easier: place reference at value = total/7 normalized to max
  const refValue = total / 7;
  if (total > 0 && refValue > 0) {
    const refX = BAR_LEFT + (refValue / max) * BAR_AREA;
    const refTop = PAD + HEAD_H - 4;
    const refBot = PAD + HEAD_H + ROWS * ROW_H + 2;
    p.push(`<line x1="${refX}" y1="${refTop}" x2="${refX}" y2="${refBot}" class="avg-line"><title>even distribution = ${(100/7).toFixed(1)}% per day</title></line>`);
  }

  let y = PAD + HEAD_H;
  let peakY = 0, peakBw = 0;
  for (let i = 0; i < 7; i++) {
    const cnt = buckets[i];
    const pct = total > 0 ? (cnt / total) * 100 : 0;
    const bw = max > 0 ? (cnt / max) * BAR_AREA : 0;
    const isPeak = i === peakIdx && cnt > 0;
    const cy = y + BAR_H + 1;
    const lblClass = isPeak ? 'day-label-peak' : 'day-label';
    const pctClass = isPeak ? 'pct-peak' : 'pct';

    p.push(`<text x="${PAD + LABEL_W - 8}" y="${cy}" class="${lblClass}" text-anchor="end">${dayNames[i]}</text>`);
    p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${BAR_AREA}" height="${BAR_H}" rx="3" class="bar-bg"/>`);
    if (bw > 0.5) {
      const lv = getLevel(cnt);
      p.push(`<rect x="${BAR_LEFT}" y="${y + 4}" width="${bw}" height="${BAR_H}" rx="3" class="b${lv}"><title>${dayFull[i]}: ${cnt} contribution${cnt === 1 ? '' : 's'} (${pct.toFixed(1)}%)</title></rect>`);
    }
    if (isPeak && bw > 0.5) {
      peakY = y + 4;
      peakBw = bw;
    }
    p.push(`<text x="${WIDTH - PAD - 40}" y="${cy}" class="count" text-anchor="end">${cnt}</text>`);
    p.push(`<text x="${WIDTH - PAD}" y="${cy}" class="${pctClass}" text-anchor="end">${pct.toFixed(1)}%</text>`);

    y += ROW_H;
  }

  if (peakBw > 0.5) {
    p.push(`<rect x="${BAR_LEFT - 1.5}" y="${peakY - 1.5}" width="${peakBw + 3}" height="${BAR_H + 3}" rx="4" class="peak-ring"/>`);
  }

  const footY = y + 18;
  if (total > 0) {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">peak grind day: <tspan class="foot-accent">${dayFull[peakIdx]}</tspan> · ${peakPct.toFixed(1)}% of the chaos · dashed line = even split</text>`);
  } else {
    p.push(`<text x="${PAD}" y="${footY}" class="foot">no activity yet · just got started</text>`);
  }

  p.push('</svg>');
  return p.join('\n');
}

// ─────────────────────────── 4. PERSONAL BESTS ───────────────────────────
function generateBests() {
  const WIDTH = 720, HEIGHT = 156;
  const b = data.bests || {};
  const s = data.streak || { longest: 0, current: 0, longestStart: null, longestEnd: null };
  const isActive = (s.current || 0) > 0;

  const cards = [
    {
      icon: '🏆',
      label: 'best day',
      value: b.bestDay ? `${b.bestDay.count}` : '—',
      unit: b.bestDay ? `W's on ${fmtDate(b.bestDay.date)}` : 'no data yet',
      featured: false,
    },
    {
      icon: '📅',
      label: 'best month',
      value: b.bestMonth ? `${b.bestMonth.count}` : '—',
      unit: b.bestMonth ? `in ${b.bestMonth.name}` : 'no data yet',
      featured: false,
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
      featured: true,
      pulse: isActive,
    },
    {
      icon: '🚀',
      label: 'first activity',
      value: b.firstActivity ? fmtDate(b.firstActivity.date) : '—',
      unit: b.firstActivity ? `kicked off 2026` : 'not started',
      featured: false,
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
.card-featured{fill:#FAF9F5;stroke:#CC785C;stroke-width:1.5}
.accent-bar{fill:#CC785C}
.card-icon{font-size:18px}
.card-icon-pulse{font-size:18px;animation:flicker 1.8s ease-in-out infinite}
@keyframes flicker{0%,100%{opacity:1}50%{opacity:.55}}
@media (prefers-reduced-motion: reduce){.card-icon-pulse{animation:none}}
.card-label{fill:#5A574E;font-size:10px;font-weight:600;letter-spacing:1.1px;text-transform:uppercase}
.card-value{fill:#181818;font-size:32px;font-weight:400;letter-spacing:-1px;font-family:${FONT_SERIF}}
.card-value-coral{fill:#CC785C;font-size:32px;font-weight:400;letter-spacing:-1px;font-family:${FONT_SERIF}}
.card-unit{fill:#5A574E;font-size:10px}
.divider-thin{stroke:#E0DCC9;stroke-width:1}
@media (prefers-color-scheme: dark){
.card{fill:#26241F;stroke:#3D3A33}
.card-featured{fill:#2A2722;stroke:#E5947A}
.accent-bar{fill:#E5947A}
.card-label{fill:#A19E92}.card-value{fill:#F0EEE6}.card-value-coral{fill:#E5947A}.card-unit{fill:#A19E92}
.divider-thin{stroke:#3D3A33}}
</style>`);

  for (let i = 0; i < COLS; i++) {
    const c = cards[i];
    const x = PAD + i * (CARD_W + GAP);
    const valueClass = c.featured ? 'card-value-coral' : 'card-value';
    const cardClass = c.featured ? 'card-featured' : 'card';
    const iconClass = c.pulse ? 'card-icon-pulse' : 'card-icon';

    p.push(`<rect x="${x}" y="${PAD}" width="${CARD_W}" height="${CARD_H}" rx="12" class="${cardClass}"/>`);
    if (c.featured) {
      // Coral accent bar at top
      p.push(`<rect x="${x + 12}" y="${PAD}" width="36" height="3" rx="1.5" class="accent-bar"/>`);
    }
    p.push(`<text x="${x + 16}" y="${PAD + 34}" class="${iconClass}">${c.icon}</text>`);
    p.push(`<text x="${x + 44}" y="${PAD + 34}" class="card-label">${escapeXml(c.label)}</text>`);
    p.push(`<line x1="${x + 16}" y1="${PAD + 44}" x2="${x + CARD_W - 16}" y2="${PAD + 44}" class="divider-thin"/>`);
    p.push(`<text x="${x + 16}" y="${PAD + 84}" class="${valueClass}">${escapeXml(c.value)}</text>`);
    p.push(`<text x="${x + 16}" y="${PAD + 104}" class="card-unit">${escapeXml(c.unit)}</text>`);
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
