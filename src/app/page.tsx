'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import styles from './page.module.css';

interface TeamMember {
  name: string;
  accountId: string;
}

interface JiraIssue {
  key?: string;
  fields: {
    assignee?: {
      accountId: string;
      displayName?: string;
    };
    timespent?: number;
    summary?: string;
    status?: {
      name: string;
    };
    issuetype?: {
      name: string;
    };
    created?: string;
  };
}

interface Stats {
  name: string;
  fullName: string;
  count: number;
  totalTimeSpent: number;
  avgTime: number;
  issues: JiraIssue[];
}

interface ReportData {
  stats: Stats[];
  total: number;
}

interface DateRange {
  start: string;
  end: string;
}

interface SprintInfo {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
}

interface ScopeDataPoint {
  date: string;
  count: number;
}

interface SprintData {
  sprint: SprintInfo;
  currentCount: number;
  initialCount: number;
  scopeHistory: ScopeDataPoint[];
}

type TabType = 'bugs' | 'dev';

const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  return {
    start: formatDate(oneWeekAgo),
    end: formatDate(today)
  };
};

const TeamKPRReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('bugs');
  const [bugData, setBugData] = useState<ReportData | null>(null);
  const [devData, setDevData] = useState<ReportData | null>(null);
  const [openBugsData, setOpenBugsData] = useState<ReportData | null>(null);
  const [sprintData, setSprintData] = useState<SprintData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamMembers: TeamMember[] = [
    { name: 'Claudinei José Santos', accountId: '712020:cd994eca-2edf-4884-ae37-d6fd47509805' },
    { name: 'Douglas Silva', accountId: '712020:0e41ece7-0cb2-4f25-b81b-d3740581b363' },
    { name: 'Raul Henrique Furtado', accountId: '712020:95038b43-8d95-48c3-acc4-dafe4f60a4f7' },
    { name: 'Rafael Eduardo Ronchi Filho', accountId: '712020:6a117fe9-0d60-4ff4-9025-b2a97fc84bf5' },
    { name: 'Kalebe', accountId: '712020:b86e161f-0468-454c-88f4-e1641899d74d' }
  ];

  const processIssues = (issues: JiraIssue[]): Stats[] => {
    return teamMembers.map(member => {
      const memberIssues = issues.filter(
        (issue: JiraIssue) => issue.fields.assignee?.accountId === member.accountId
      );

      const totalTime = memberIssues.reduce((sum: number, issue: JiraIssue) => {
        return sum + (issue.fields.timespent || 0);
      }, 0);

      const avgTime = memberIssues.length > 0
        ? totalTime / memberIssues.length
        : 0;

      return {
        name: member.name.split(' ')[0],
        fullName: member.name,
        count: memberIssues.length,
        totalTimeSpent: totalTime,
        avgTime: avgTime,
        issues: memberIssues
      };
    });
  };

  const processOpenBugs = (issues: JiraIssue[]): Stats[] => {
    const now = new Date();
    return teamMembers.map(member => {
      const memberIssues = issues.filter(
        (issue: JiraIssue) => issue.fields.assignee?.accountId === member.accountId
      );

      const totalOpenTime = memberIssues.reduce((sum: number, issue: JiraIssue) => {
        if (issue.fields.created) {
          const createdDate = new Date(issue.fields.created);
          const openTimeSeconds = (now.getTime() - createdDate.getTime()) / 1000;
          return sum + openTimeSeconds;
        }
        return sum;
      }, 0);

      const avgOpenTime = memberIssues.length > 0
        ? totalOpenTime / memberIssues.length
        : 0;

      return {
        name: member.name.split(' ')[0],
        fullName: member.name,
        count: memberIssues.length,
        totalTimeSpent: totalOpenTime,
        avgTime: avgOpenTime,
        issues: memberIssues
      };
    });
  };

  const fetchData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const accountIds = teamMembers.map(m => m.accountId);

      const [bugResponse, devResponse, openBugsResponse, sprintResponse] = await Promise.all([
        fetch("/api/jira-bugs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: dateRange.start, endDate: dateRange.end, accountIds }),
        }),
        fetch("/api/jira-dev", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ startDate: dateRange.start, endDate: dateRange.end, accountIds }),
        }),
        fetch("/api/jira-open-bugs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountIds }),
        }),
        fetch("/api/jira-sprint"),
      ]);

      if (!bugResponse.ok) {
        const errorData = await bugResponse.json();
        throw new Error(errorData.error || `HTTP error ${bugResponse.status}`);
      }
      if (!devResponse.ok) {
        const errorData = await devResponse.json();
        throw new Error(errorData.error || `HTTP error ${devResponse.status}`);
      }
      if (!openBugsResponse.ok) {
        const errorData = await openBugsResponse.json();
        throw new Error(errorData.error || `HTTP error ${openBugsResponse.status}`);
      }

      const bugResult = await bugResponse.json();
      const devResult = await devResponse.json();
      const openBugsResult = await openBugsResponse.json();

      const bugIssues: JiraIssue[] = bugResult.issues || [];
      const devIssues: JiraIssue[] = devResult.issues || [];
      const openBugsIssues: JiraIssue[] = openBugsResult.issues || [];

      setBugData({ stats: processIssues(bugIssues), total: bugIssues.length });
      setOpenBugsData({ stats: processOpenBugs(openBugsIssues), total: openBugsIssues.length });
      setDevData({ stats: processIssues(devIssues), total: devIssues.length });

      // Sprint fetch is best-effort — don't block the report if it fails
      if (sprintResponse.ok) {
        setSprintData(await sprintResponse.json());
      } else {
        setSprintData(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro inesperado';
      setError(errorMessage);
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: ValueType | undefined): string => {
    const numSeconds = typeof seconds === 'number' ? seconds : 0;
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDays = (seconds: ValueType | undefined): string => {
    const numSeconds = typeof seconds === 'number' ? seconds : 0;
    const days = Math.floor(numSeconds / 86400);
    const hours = Math.floor((numSeconds % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  const currentData = activeTab === 'bugs' ? bugData : devData;
  const hasData = bugData || devData || openBugsData;

  const startPresentation = () => {
    if (!bugData && !devData && !openBugsData) return;

    const presentationData = {
      bugData,
      devData,
      openBugsData,
      sprintData,
      dateRange
    };

    localStorage.setItem('presentationData', JSON.stringify(presentationData));
    window.open('/presentation', '_blank');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>KPI de Performance do Time</h1>

      <div className={styles.dateRangeSection}>
        <h2 className={styles.dateRangeTitle}>Intervalo de Datas</h2>
        <div className={styles.dateRangeForm}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Data Início</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className={styles.dateInput}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Data Fim</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className={styles.dateInput}
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? 'Carregando...' : 'Atualizar Dados'}
          </button>
          <Link href="/sprint" className={styles.sprintButton}>
            Ver Sprint
          </Link>
          {hasData && (
            <button
              onClick={startPresentation}
              className={styles.presentationButton}
            >
              Iniciar Apresentação
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          Erro: {error}
        </div>
      )}

      {hasData && (
        <>
          <div className={styles.tabsContainer}>
            <div className={styles.tabList}>
              <button
                className={`${styles.tab} ${activeTab === 'bugs' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('bugs')}>
                Bugs & Hotfixes
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'dev' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('dev')}>
                Desenvolvimento (DEV)
              </button>
            </div>
          </div>

          {currentData && (
            <div className={styles.tabContent}>
              <div className={activeTab === 'bugs' ? styles.performanceSection : styles.devSection}>
                <h2 className={styles.sectionTitle}>
                  {activeTab === 'bugs' ? 'Bugs & Hotfixes Performance' : 'Desenvolvimento Performance'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {activeTab === 'bugs'
                    ? 'Tempo médio por bug (Status: Produção ou Aguardando Deploy)'
                    : 'Tempo médio por card (Status: Produção ou Aguardando Deploy)'}
                </p>

                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <div className={styles.statValue}>{currentData.total}</div>
                    <div className={styles.statLabel}>
                      {activeTab === 'bugs' ? 'Total de Bugs' : 'Total de Cards DEV'}
                    </div>
                  </div>
                  {currentData.stats.map((member: Stats, idx: number) => (
                    <div key={idx} className={styles.statCard}>
                      <div className={styles.statValue}>{member.count}</div>
                      <div className={styles.statLabel}>{member.name}</div>
                    </div>
                  ))}
                </div>

                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>
                    {activeTab === 'bugs' ? 'Média de Tempo por Bug' : 'Média de Tempo por Card DEV'}
                  </h3>
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={currentData.stats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis
                          tickFormatter={(value) => {
                            const hours = Math.floor(value / 3600);
                            return `${hours}h`;
                          }}
                          label={{
                            value: 'Horas',
                            angle: -90,
                            position: 'insideLeft',
                            style: { textAnchor: 'middle' }
                          }}
                        />
                        <Tooltip
                          formatter={(value) => formatTime(value)}
                          labelStyle={{ color: '#000' }}
                        />
                        <Legend />
                        <Bar
                          dataKey="avgTime"
                          fill={activeTab === 'bugs' ? '#3B82F6' : '#16a34a'}
                          name="Tempo Médio"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.tableCard}>
                  <h3 className={styles.tableTitle}>Tabela Detalhada</h3>
                  <div className={styles.tableWrapper}>
                    <table className={styles.dataTable}>
                      <thead>
                        <tr>
                          <th>Desenvolvedor</th>
                          <th className={styles.center}>
                            {activeTab === 'bugs' ? 'Qtd. Bugs' : 'Qtd. Cards'}
                          </th>
                          <th className={styles.center}>Tempo Total</th>
                          <th className={styles.center}>Tempo Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentData.stats.map((member: Stats, idx: number) => (
                          <tr key={idx}>
                            <td>{member.fullName}</td>
                            <td className={styles.center}>{member.count}</td>
                            <td className={styles.center}>{formatTime(member.totalTimeSpent)}</td>
                            <td className={styles.center}>{formatTime(member.avgTime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {activeTab === 'bugs' && openBugsData && (
                <div className={styles.openBugsSection} style={{ marginTop: '2rem' }}>
                  <h2 className={styles.sectionTitle}>Bugs Abertos - Tempo em Aberto</h2>
                  <p className={styles.sectionSubtitle}>
                    Média de tempo que os bugs estão abertos por desenvolvedor
                  </p>

                  <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                      <div className={styles.statValue}>{openBugsData.total}</div>
                      <div className={styles.statLabel}>Total Bugs Abertos</div>
                    </div>
                    {openBugsData.stats.map((member: Stats, idx: number) => (
                      <div key={idx} className={styles.statCard}>
                        <div className={styles.statValue}>{member.count}</div>
                        <div className={styles.statLabel}>{member.name}</div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.chartCard}>
                    <h3 className={styles.chartTitle}>Média de Tempo em Aberto por Desenvolvedor</h3>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={openBugsData.stats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis
                            tickFormatter={(value) => {
                              const days = Math.floor(value / 86400);
                              return `${days}d`;
                            }}
                            label={{
                              value: 'Dias',
                              angle: -90,
                              position: 'insideLeft',
                              style: { textAnchor: 'middle' }
                            }}
                          />
                          <Tooltip
                            formatter={(value) => formatDays(value)}
                            labelStyle={{ color: '#000' }}
                          />
                          <Legend />
                          <Bar
                            dataKey="avgTime"
                            fill="#f59e0b"
                            name="Tempo Médio em Aberto"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={styles.tableCard}>
                    <h3 className={styles.tableTitle}>Tabela Detalhada</h3>
                    <div className={styles.tableWrapper}>
                      <table className={styles.dataTable}>
                        <thead>
                          <tr>
                            <th>Desenvolvedor</th>
                            <th className={styles.center}>Qtd. Bugs Abertos</th>
                            <th className={styles.center}>Tempo Médio Aberto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {openBugsData.stats.map((member: Stats, idx: number) => (
                            <tr key={idx}>
                              <td>{member.fullName}</td>
                              <td className={styles.center}>{member.count}</td>
                              <td className={styles.center}>{formatDays(member.avgTime)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'bugs' && bugData && openBugsData && (
                <div className={styles.comparisonSection} style={{ marginTop: '2rem' }}>
                  <h2 className={styles.sectionTitle}>Comparativo de Tempo de Bugs</h2>
                  <p className={styles.sectionSubtitle}>
                    Tempo médio em aberto vs Tempo médio de resolução
                  </p>

                  <div className={styles.comparisonGrid}>
                    <div className={`${styles.comparisonCard} ${styles.openTimeCard}`}>
                      <div className={styles.comparisonIcon}>⏳</div>
                      <div className={styles.comparisonValue}>
                        {formatDays(
                          openBugsData.total > 0
                            ? openBugsData.stats.reduce((sum, m) => sum + (m.avgTime * m.count), 0) / openBugsData.total
                            : 0
                        )}
                      </div>
                      <div className={styles.comparisonLabel}>Tempo Médio em Aberto</div>
                      <div className={styles.comparisonDescription}>
                        Média de tempo que os bugs permanecem abertos no backlog
                      </div>
                      <div className={styles.comparisonCount}>
                        {openBugsData.total} bugs abertos
                      </div>
                    </div>

                    <div className={`${styles.comparisonCard} ${styles.resolutionTimeCard}`}>
                      <div className={styles.comparisonIcon}>✅</div>
                      <div className={styles.comparisonValue}>
                        {formatTime(
                          bugData.total > 0
                            ? bugData.stats.reduce((sum, m) => sum + (m.avgTime * m.count), 0) / bugData.total
                            : 0
                        )}
                      </div>
                      <div className={styles.comparisonLabel}>Tempo Médio de Resolução</div>
                      <div className={styles.comparisonDescription}>
                        Média de tempo de trabalho para resolver um bug
                      </div>
                      <div className={styles.comparisonCount}>
                        {bugData.total} bugs resolvidos
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!hasData && !loading && (
        <div className={styles.emptyState}>
          Selecione um intervalo de datas e clique em Atualizar Dados
        </div>
      )}
    </div>
  );
};

export default TeamKPRReport;
