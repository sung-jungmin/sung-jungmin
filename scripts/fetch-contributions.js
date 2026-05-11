import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TARGET_LOGIN = process.env.TARGET_LOGIN || 'sung-jungmin';
const TIMEZONE = 'America/New_York';

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Single GraphQL query — contributionCalendar's daily counts already aggregate
// ALL contribution types (commits, issues, PRs, reviews) across public AND
// private repos (including organization private). This is the only data source
// that doesn't require per-repo access permissions.
const QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    name
    login
    avatarUrl
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

async function graphql(query, variables) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'github-frontpage-bot',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

function transformMonths(weeks) {
  const monthMap = new Map();
  for (let m = 1; m <= 12; m++) monthMap.set(m, []);
  for (const week of weeks) {
    for (const day of week.contributionDays) {
      const [y, mStr] = day.date.split('-');
      if (y !== '2026') continue;
      monthMap.get(parseInt(mStr, 10)).push({ date: day.date, count: day.contributionCount });
    }
  }
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const days = monthMap.get(m).sort((a, b) => a.date.localeCompare(b.date));
    const total = days.reduce((s, d) => s + d.count, 0);
    months.push({ month: m, name: MONTH_NAMES[m - 1], totalContributions: total, days });
  }
  return months;
}

function flattenDays(months) {
  return months.flatMap(m => m.days).sort((a, b) => a.date.localeCompare(b.date));
}

function todayInEst() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function calcStreaks(allDays) {
  const today = todayInEst();
  let current = 0, currentStart = null, currentEnd = null;
  let foundFirstNonZero = false;
  for (let i = allDays.length - 1; i >= 0; i--) {
    const d = allDays[i];
    if (d.date > today) continue;
    if (d.count > 0) {
      if (!foundFirstNonZero) currentEnd = d.date;
      foundFirstNonZero = true;
      current++;
      currentStart = d.date;
    } else {
      if (foundFirstNonZero) break;
      if (d.date !== today) break;
    }
  }

  let longest = 0, longestStart = null, longestEnd = null;
  let runLen = 0, runStart = null, runEnd = null;
  for (const d of allDays) {
    if (d.date > today) break;
    if (d.count > 0) {
      if (runLen === 0) runStart = d.date;
      runEnd = d.date;
      runLen++;
      if (runLen > longest) {
        longest = runLen;
        longestStart = runStart;
        longestEnd = runEnd;
      }
    } else {
      runLen = 0;
    }
  }

  return { current, currentStart, currentEnd, longest, longestStart, longestEnd };
}

function calcWeekdayDistribution(allDays) {
  // 7 buckets: Mon=0 ... Sun=6 in EST. Uses the same daily counts as the
  // calendar, so this covers EVERY contribution including private org commits.
  const buckets = Array(7).fill(0);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' });
  const weekdayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  for (const d of allDays) {
    if (d.count === 0) continue;
    // Parse date as EST noon to avoid DST boundary ambiguity.
    const date = new Date(`${d.date}T12:00:00-05:00`);
    const wkPart = fmt.formatToParts(date).find(p => p.type === 'weekday');
    if (!wkPart) continue;
    const dow = weekdayMap[wkPart.value];
    if (dow !== undefined) buckets[dow] += d.count;
  }
  return buckets;
}

async function main() {
  console.log(`Fetching 2026 data for ${TARGET_LOGIN}...`);

  const from = '2026-01-01T05:00:00Z';
  const yearEnd = new Date('2027-01-01T05:00:00Z');
  const now = new Date();
  const to = (now < yearEnd ? now : yearEnd).toISOString();

  const data = await graphql(QUERY, { login: TARGET_LOGIN, from, to });
  const user = data.user;
  const cc = user.contributionsCollection;

  const months = transformMonths(cc.contributionCalendar.weeks);
  const allDays = flattenDays(months);
  const streak = calcStreaks(allDays);
  const weekdayDistribution = calcWeekdayDistribution(allDays);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      year: 2026,
      login: TARGET_LOGIN,
      timezone: TIMEZONE,
    },
    profile: {
      name: user.name || user.login,
      login: user.login,
      avatarUrl: user.avatarUrl,
      totalContributions: cc.contributionCalendar.totalContributions,
    },
    months,
    streak,
    weekdayDistribution,
  };

  const dataDir = join(ROOT, 'data');
  mkdirSync(dataDir, { recursive: true });
  const outPath = join(dataDir, 'contributions-2026.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  const totalBucketed = weekdayDistribution.reduce((s, v) => s + v, 0);
  console.log(
    `Updated: ${output.profile.totalContributions} contributions · ` +
    `weekday distribution=[${weekdayDistribution.join(',')}]=${totalBucketed} · ` +
    `streak ${streak.current}/${streak.longest}`
  );
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
