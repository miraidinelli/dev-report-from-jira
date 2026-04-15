import { NextRequest, NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_SITE = 'https://8quali.atlassian.net';

interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    assignee?: {
      accountId: string;
      displayName: string;
    };
    status?: {
      name: string;
    };
    timespent?: number;
    created?: string;
    updated?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
      return NextResponse.json(
        { error: 'Jira credentials not configured. Set JIRA_EMAIL and JIRA_API_TOKEN environment variables.' },
        { status: 500 }
      );
    }

    const { accountIds } = await request.json();

    if (!accountIds) {
      return NextResponse.json(
        { error: 'Missing required parameter: accountIds' },
        { status: 400 }
      );
    }

    const accountIdsJql = accountIds.map((id: string) => `"${id}"`).join(', ');

    const jql = `project = PROD AND type = Correção AND assignee IN (${accountIdsJql}) AND status IN ("Aguardando Execução", "Code Review", Execução, "Pronto para Code Review") ORDER BY cf[10019] ASC`;

    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

    const PAGE_SIZE = 50;
    let startAt = 0;
    let allIssues: JiraIssue[] = [];
    let totalIssues = 0;

    do {
      const params = new URLSearchParams({
        jql,
        maxResults: String(PAGE_SIZE),
        startAt: String(startAt),
        fields: 'summary,assignee,status,created,updated',
        expand: 'changelog',
      });

      const response = await fetch(
        `${JIRA_SITE}/rest/api/3/search/jql?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
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

      // Attach the time entered "Aguardando Execução" as a synthetic field
      const issuesWithEntryTime = data.issues.map((issue: JiraIssue & { changelog?: { histories: Array<{ created: string; items: Array<{ field: string; toString: string }> }> } }) => {
        let enteredStatusAt: string | undefined;

        if (issue.changelog?.histories) {
          // Find the most recent transition TO "Aguardando Execução"
          const transition = [...issue.changelog.histories]
            .reverse()
            .find(h => h.items.some(i => i.field === 'status' && i.toString === 'Aguardando Execução'));
          if (transition) {
            enteredStatusAt = transition.created;
          }
        }

        return {
          ...issue,
          fields: {
            ...issue.fields,
            // Use transition time if found, otherwise fall back to created
            created: enteredStatusAt ?? issue.fields.created,
          },
        };
      });

      allIssues = allIssues.concat(issuesWithEntryTime);
      startAt += data.issues.length;
    } while (startAt < totalIssues);

    return NextResponse.json({
      issues: allIssues,
      total: totalIssues,
    });
  } catch (error) {
    console.error('Error fetching Jira open bugs data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Jira open bugs data' },
      { status: 500 }
    );
  }
}
