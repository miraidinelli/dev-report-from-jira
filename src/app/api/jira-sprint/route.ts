import { NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_SITE = 'https://8quali.atlassian.net';

interface SprintField {
  id: number;
  name: string;
  state: string;
  startDate: string;
  endDate: string;
}

interface ChangelogItem {
  field: string;
  to: string | null;
}

interface ChangelogHistory {
  created: string;
  items: ChangelogItem[];
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary?: string;
    status?: { name: string };
    assignee?: { accountId: string; displayName: string };
    created?: string;
    customfield_10020?: SprintField[];
  };
  changelog?: {
    histories: ChangelogHistory[];
  };
}

export async function GET() {
  if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    return NextResponse.json({ error: 'Jira credentials not configured' }, { status: 500 });
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const jql = `project = PROD AND sprint in openSprints() ORDER BY created ASC`;

  const PAGE_SIZE = 50;
  let startAt = 0;
  let allIssues: JiraIssue[] = [];
  let totalIssues = 0;

  do {
    const params = new URLSearchParams({
      jql,
      maxResults: String(PAGE_SIZE),
      startAt: String(startAt),
      fields: 'summary,status,assignee,created,customfield_10020',
      expand: 'changelog',
    });

    const response = await fetch(
      `${JIRA_SITE}/rest/api/3/search/jql?${params.toString()}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Jira API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    totalIssues = data.total;
    allIssues = allIssues.concat(data.issues);
    startAt += data.issues.length;
  } while (startAt < totalIssues);

  // Extract active sprint from the first issue that has one
  let activeSprint: SprintField | undefined;
  for (const issue of allIssues) {
    const active = (issue.fields.customfield_10020 ?? []).find(s => s.state === 'active');
    if (active) {
      activeSprint = active;
      break;
    }
  }

  if (!activeSprint) {
    return NextResponse.json({ error: 'No active sprint found' }, { status: 404 });
  }

  const sprintId = activeSprint.id;
  const sprintStartDate = new Date(activeSprint.startDate);
  const today = new Date();

  // Determine when each issue was added to this sprint (via changelog)
  const issueEntryDates: string[] = allIssues.map(issue => {
    let entryDate: Date | undefined;

    const sortedHistories = [...(issue.changelog?.histories ?? [])].sort(
      (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()
    );

    for (const history of sortedHistories) {
      const sprintChange = history.items.find(
        item =>
          item.field === 'Sprint' &&
          item.to != null &&
          item.to.split(',').map(s => s.trim()).includes(String(sprintId))
      );
      if (sprintChange) {
        entryDate = new Date(history.created);
        break;
      }
    }

    // No changelog entry = was in sprint from the start; clamp to sprint start
    const resolved = entryDate ?? sprintStartDate;
    const clamped = resolved < sprintStartDate ? sprintStartDate : resolved;
    return clamped.toISOString().split('T')[0];
  });

  // Build day-by-day cumulative scope from sprint start to today
  const startDateStr = sprintStartDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const dates: string[] = [];
  const cursor = new Date(sprintStartDate);
  while (cursor.toISOString().split('T')[0] <= todayStr) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }

  const scopeHistory = dates.map(date => ({
    date,
    count: issueEntryDates.filter(d => d <= date).length,
  }));

  const initialCount = issueEntryDates.filter(d => d <= startDateStr).length;

  return NextResponse.json({
    sprint: {
      id: activeSprint.id,
      name: activeSprint.name,
      startDate: activeSprint.startDate,
      endDate: activeSprint.endDate,
      state: activeSprint.state,
    },
    currentCount: allIssues.length,
    initialCount,
    scopeHistory,
  });
}
