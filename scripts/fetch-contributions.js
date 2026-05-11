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

const QUERY_MAIN = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    id
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
      commitContributionsByRepository(maxRepositories: 50) {
        repository {
          owner { login }
          name
          nameWithOwner
          primaryLanguage { name color }
        }
        contributions { totalCount }
      }
    }
  }
}
`;

function buildHistoryQuery(repoEntries) {
  const aliases = repoEntries.map((r, i) => {
    const owner = JSON.stringify(r.repository.owner.login);
    const name = JSON.stringify(r.repository.name);
    return `r${i}: repository(owner: ${owner}, name: ${name}) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(since: $from, until: $to, author: {id: $userId}, first: 100) {
              nodes { committedDate }
            }
          }
        }
      }
    }`;
  }).join('\n');
  return `query($userId: ID!, $from: DateTime!, $to: DateTime!) { ${aliases} }`;
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
  }).format(new Date()); // returns "YYYY-MM-DD"
}

function calcStreaks(allDays) {
  const today = todayInEst();

  // Current streak: walk backward from today, count consecutive non-zero days.
  // If today is zero but yesterday wasn't, streak still ongoing (today not over yet).
  let current = 0;
  let currentStart = null;
  let currentEnd = null;
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
      if (d.date !== today) break; // zero day that isn't today → streak broken
    }
  }

  // Longest streak: scan forward
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

function calcLanguages(commitContrib) {
  const map = new Map();
  let totalAttributed = 0;
  let totalAll = 0;
  for (const c of commitContrib) {
    const count = c.contributions.totalCount;
    totalAll += count;
    const lang = c.repository.primaryLanguage;
    if (!lang) continue;
    totalAttributed += count;
    const key = lang.name;
    if (!map.has(key)) {
      map.set(key, { name: lang.name, color: lang.color || '#888888', commits: 0 });
    }
    map.get(key).commits += count;
  }
  const sorted = [...map.values()].sort((a, b) => b.commits - a.commits);
  for (const l of sorted) {
    l.percentage = totalAttributed > 0 ? (l.commits / totalAttributed) * 100 : 0;
  }
  return { totalAttributed, totalAll, languages: sorted };
}

function calcHeatmap(timestamps) {
  // 7 rows (Mon=0 .. Sun=6) × 24 hours, counts in EST
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  });
  const weekdayMap = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  for (const ts of timestamps) {
    const parts = fmt.formatToParts(new Date(ts));
    const wkPart = parts.find(p => p.type === 'weekday');
    const hPart = parts.find(p => p.type === 'hour');
    if (!wkPart || !hPart) continue;
    const dow = weekdayMap[wkPart.value];
    let hour = parseInt(hPart.value, 10);
    if (hour === 24) hour = 0;
    if (dow !== undefined && !isNaN(hour)) grid[dow][hour]++;
  }
  return grid;
}

async function main() {
  console.log(`Fetching 2026 data for ${TARGET_LOGIN}...`);

  const from = '2026-01-01T05:00:00Z';
  const yearEnd = new Date('2027-01-01T05:00:00Z');
  const now = new Date();
  const to = (now < yearEnd ? now : yearEnd).toISOString();

  // Step 1: main query
  const data = await graphql(QUERY_MAIN, { login: TARGET_LOGIN, from, to });
  const user = data.user;
  const cc = user.contributionsCollection;

  const months = transformMonths(cc.contributionCalendar.weeks);
  const allDays = flattenDays(months);
  const streak = calcStreaks(allDays);
  const langData = calcLanguages(cc.commitContributionsByRepository);

  // Step 2: fetch commit timestamps for heatmap
  let heatmap = null;
  const repos = cc.commitContributionsByRepository.filter(r => r.repository && r.repository.owner);
  if (repos.length > 0) {
    try {
      const historyQuery = buildHistoryQuery(repos);
      const histData = await graphql(historyQuery, { userId: user.id, from, to });
      const timestamps = [];
      for (const key of Object.keys(histData)) {
        const repo = histData[key];
        const nodes = repo && repo.defaultBranchRef && repo.defaultBranchRef.target
          ? repo.defaultBranchRef.target.history.nodes : [];
        for (const n of nodes) timestamps.push(n.committedDate);
      }
      heatmap = calcHeatmap(timestamps);
      console.log(`Fetched ${timestamps.length} commit timestamps for heatmap`);
    } catch (err) {
      console.error('Warning: heatmap query failed:', err.message);
      heatmap = null;
    }
  }

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
    languages: langData.languages,
    languageStats: {
      totalAttributed: langData.totalAttributed,
      totalAll: langData.totalAll,
    },
    streak,
    heatmap: heatmap || Array.from({ length: 7 }, () => Array(24).fill(0)),
  };

  const dataDir = join(ROOT, 'data');
  mkdirSync(dataDir, { recursive: true });
  const outPath = join(dataDir, 'contributions-2026.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  console.log(`Updated: ${output.profile.totalContributions} contributions · ${output.languages.length} languages · streak ${streak.current}/${streak.longest}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
