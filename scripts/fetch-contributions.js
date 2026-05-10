import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const TARGET_LOGIN = process.env.TARGET_LOGIN || 'sung-jungmin';

if (!GITHUB_TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

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

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

async function fetchContributions() {
  const now = new Date();
  const from = '2026-01-01T00:00:00Z';
  const yearEnd = new Date('2026-12-31T23:59:59Z');
  const to = (now < yearEnd ? now : yearEnd).toISOString();

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'github-frontpage-bot',
    },
    body: JSON.stringify({ query: QUERY, variables: { login: TARGET_LOGIN, from, to } }),
  });

  if (!response.ok) {
    console.error(`GitHub API HTTP error: ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  const json = await response.json();

  if (json.errors) {
    console.error('GitHub GraphQL errors:', JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  return json.data;
}

function transformToMonths(data) {
  const { user } = data;
  const { weeks, totalContributions } = user.contributionsCollection.contributionCalendar;

  // Group all days by month
  const monthMap = new Map();
  for (let m = 1; m <= 12; m++) {
    monthMap.set(m, []);
  }

  for (const week of weeks) {
    for (const day of week.contributionDays) {
      const [year, monthStr] = day.date.split('-');
      if (year !== '2026') continue;
      const month = parseInt(monthStr, 10);
      monthMap.get(month).push({ date: day.date, count: day.contributionCount });
    }
  }

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const days = monthMap.get(m).sort((a, b) => a.date.localeCompare(b.date));
    const total = days.reduce((sum, d) => sum + d.count, 0);
    months.push({
      month: m,
      name: MONTH_NAMES[m - 1],
      totalContributions: total,
      days,
    });
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      year: 2026,
      login: TARGET_LOGIN,
    },
    profile: {
      name: user.name || user.login,
      login: user.login,
      avatarUrl: user.avatarUrl,
      totalContributions,
    },
    months,
  };
}

async function main() {
  console.log(`Fetching 2026 contributions for ${TARGET_LOGIN}...`);

  const data = await fetchContributions();
  const output = transformToMonths(data);

  const dataDir = join(ROOT, 'data');
  mkdirSync(dataDir, { recursive: true });
  const outPath = join(dataDir, 'contributions-2026.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

  const total = output.profile.totalContributions;
  console.log(`Updated: 2026 contributions for ${TARGET_LOGIN} (${total} total)`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
