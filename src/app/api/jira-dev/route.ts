import { NextRequest, NextResponse } from 'next/server';

const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_SITE = 'https://8quali.atlassian.net';

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}

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
    issuetype?: {
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

    const { startDate, endDate, accountIds } = await request.json();

    if (!startDate || !endDate || !accountIds) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate, accountIds' },
        { status: 400 }
      );
    }

    const accountIdsJql = accountIds.map((id: string) => `"${id}"`).join(', ');
    const jql = `project = PROD AND type = Feature AND status IN (Produção, "Aguardando Deploy") AND updated >= "${startDate}" AND updated <= "${endDate}" AND assignee IN (${accountIdsJql}) ORDER BY cf[10019] ASC`;

    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

    const params = new URLSearchParams({
      jql,
      maxResults: '100',
      fields: 'summary,assignee,status,issuetype,timespent,created,updated',
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

    const data: JiraSearchResponse = await response.json();

    return NextResponse.json({
      issues: data.issues,
      total: data.total,
    });
  } catch (error) {
    console.error('Error fetching Jira data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Jira data' },
      { status: 500 }
    );
  }
}
