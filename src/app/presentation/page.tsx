'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import styles from './page.module.css';

interface Stats {
  name: string;
  fullName: string;
  count: number;
  totalTimeSpent: number;
  avgTime: number;
}

interface ReportData {
  stats: Stats[];
  total: number;
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

interface PresentationData {
  bugData: ReportData | null;
  devData: ReportData | null;
  openBugsData: ReportData | null;
  sprintData: SprintData | null;
  dateRange: {
    start: string;
    end: string;
  };
}

type SlideType = 'bug-stats' | 'bug-chart' | 'bug-table' | 'openBugs-stats' | 'openBugs-chart' | 'openBugs-table' | 'bug-comparison' | 'dev-stats' | 'dev-chart' | 'dev-table' | 'sprint-progress' | 'sprint-scope';

const SLIDE_DURATION = 25000; // 25 seconds

const SLIDES: SlideType[] = [
  'sprint-progress',
  'sprint-scope',
  'bug-stats',
  'bug-chart',
  'bug-table',
  'openBugs-stats',
  'openBugs-chart',
  'openBugs-table',
  'bug-comparison',
  'dev-stats',
  'dev-chart',
  'dev-table',
];

const PresentationMode: React.FC = () => {
  const [data, setData] = useState<PresentationData | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('presentationData');
    if (storedData) {
      setData(JSON.parse(storedData));
    }
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
    setProgress(0);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  }, []);

  useEffect(() => {
    if (isPaused || !data) return;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + (100 / (SLIDE_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [isPaused, data, nextSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'p' || e.key === 'P') {
        setIsPaused((prev) => !prev);
      } else if (e.key === 'Escape') {
        window.close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

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

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.noData}>
          <h1>Nenhum dado disponível</h1>
          <p>Por favor, carregue os dados na página principal primeiro.</p>
        </div>
      </div>
    );
  }

  const currentSlide = SLIDES[currentSlideIndex];

  const renderStatsSlide = (reportData: ReportData | null, type: 'bugs' | 'dev' | 'openBugs') => {
    if (!reportData) return null;

    const titles = {
      bugs: 'Bugs & Hotfixes',
      dev: 'Desenvolvimento (DEV)',
      openBugs: 'Bugs Abertos'
    };

    const subtitles = {
      bugs: 'Quantidade de bugs por desenvolvedor',
      dev: 'Quantidade de cards por desenvolvedor',
      openBugs: 'Quantidade de bugs abertos por desenvolvedor'
    };

    const totalLabels = {
      bugs: 'Total de Bugs',
      dev: 'Total de Cards',
      openBugs: 'Total Bugs Abertos'
    };

    return (
      <div className={styles.slideContent}>
        <h2 className={styles.slideTitle}>
          {titles[type]}
        </h2>
        <p className={styles.slideSubtitle}>
          {subtitles[type]}
        </p>
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.totalCard}`}>
            <div className={`${styles.statValue} ${type === 'dev' ? styles.devValue : type === 'openBugs' ? styles.openBugsValue : ''}`}>
              {reportData.total}
            </div>
            <div className={styles.statLabel}>
              {totalLabels[type]}
            </div>
          </div>
          {reportData.stats.map((member, idx) => (
            <div key={idx} className={styles.statCard}>
              <div className={`${styles.statValue} ${type === 'dev' ? styles.devValue : type === 'openBugs' ? styles.openBugsValue : ''}`}>
                {member.count}
              </div>
              <div className={styles.statLabel}>{member.fullName}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderChartSlide = (reportData: ReportData | null, type: 'bugs' | 'dev' | 'openBugs') => {
    if (!reportData) return null;

    const titles = {
      bugs: 'Média de Tempo por Bug',
      dev: 'Média de Tempo por Card DEV',
      openBugs: 'Média de Tempo em Aberto por Desenvolvedor'
    };

    const subtitles = {
      bugs: 'Tempo médio gasto por bug (Status: Produção ou Aguardando Deploy)',
      dev: 'Tempo médio gasto por card (Status: Produção ou Aguardando Deploy)',
      openBugs: 'Tempo médio que os bugs estão abertos por desenvolvedor'
    };

    const colors = {
      bugs: '#3B82F6',
      dev: '#16a34a',
      openBugs: '#f59e0b'
    };

    const legendLabels = {
      bugs: 'Tempo Médio',
      dev: 'Tempo Médio',
      openBugs: 'Tempo Médio em Aberto'
    };

    return (
      <div className={styles.slideContent}>
        <h2 className={styles.slideTitle}>
          {titles[type]}
        </h2>
        <p className={styles.slideSubtitle}>
          {subtitles[type]}
        </p>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportData.stats} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#e5e7eb', fontSize: 18 }}
                axisLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                tick={{ fill: '#e5e7eb', fontSize: 16 }}
                axisLine={{ stroke: '#4b5563' }}
                tickFormatter={(value) => {
                  if (type === 'openBugs') {
                    const days = Math.floor(value / 86400);
                    return `${days}d`;
                  }
                  const hours = Math.floor(value / 3600);
                  return `${hours}h`;
                }}
                label={{
                  value: type === 'openBugs' ? 'Dias' : 'Horas',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#e5e7eb', fontSize: 14 }
                }}
              />
              <Tooltip
                formatter={(value) => type === 'openBugs' ? formatDays(value) : formatTime(value)}
                labelStyle={{ color: '#000' }}
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#e5e7eb'
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 20 }}
                formatter={() => <span style={{ color: '#e5e7eb', fontSize: 16 }}>{legendLabels[type]}</span>}
              />
              <Bar
                dataKey="avgTime"
                fill={colors[type]}
                name={legendLabels[type]}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderTableSlide = (reportData: ReportData | null, type: 'bugs' | 'dev' | 'openBugs') => {
    if (!reportData) return null;

    const titles = {
      bugs: 'Tabela Detalhada - Bugs & Hotfixes',
      dev: 'Tabela Detalhada - Desenvolvimento',
      openBugs: 'Tabela Detalhada - Bugs Abertos'
    };

    const countLabels = {
      bugs: 'Qtd. Bugs',
      dev: 'Qtd. Cards',
      openBugs: 'Qtd. Abertos'
    };

    const timeFormatter = type === 'openBugs' ? formatDays : formatTime;

    return (
      <div className={styles.slideContent}>
        <h2 className={styles.slideTitleCompact}>
          {titles[type]}
        </h2>
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Desenvolvedor</th>
                <th className={styles.center}>
                  {countLabels[type]}
                </th>
                <th className={styles.center}>{type === 'openBugs' ? 'Tempo Médio Aberto' : 'Tempo Médio'}</th>
              </tr>
            </thead>
            <tbody>
              {reportData.stats.map((member, idx) => (
                <tr key={idx}>
                  <td>{member.fullName}</td>
                  <td className={styles.center}>{member.count}</td>
                  <td className={styles.center}>{timeFormatter(member.avgTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderComparisonSlide = () => {
    if (!data.bugData || !data.openBugsData) return null;

    // Calculate overall averages
    const totalResolvedBugs = data.bugData.stats.reduce((sum, m) => sum + m.count, 0);
    const totalResolvedTime = data.bugData.stats.reduce((sum, m) => sum + (m.avgTime * m.count), 0);
    const avgResolutionTime = totalResolvedBugs > 0 ? totalResolvedTime / totalResolvedBugs : 0;

    const totalOpenBugs = data.openBugsData.stats.reduce((sum, m) => sum + m.count, 0);
    const totalOpenTime = data.openBugsData.stats.reduce((sum, m) => sum + (m.avgTime * m.count), 0);
    const avgOpenTime = totalOpenBugs > 0 ? totalOpenTime / totalOpenBugs : 0;

    return (
      <div className={styles.slideContent}>
        <h2 className={styles.slideTitle}>
          Comparativo de Tempo de Bugs
        </h2>
        <p className={styles.slideSubtitle}>
          Tempo médio em aberto vs Tempo médio de resolução
        </p>
        <div className={styles.comparisonGrid}>
          <div className={`${styles.comparisonCard} ${styles.openTimeCard}`}>
            <div className={styles.comparisonIcon}>&#x23F3;</div>
            <div className={styles.comparisonValue}>
              {formatDays(avgOpenTime)}
            </div>
            <div className={styles.comparisonLabel}>Tempo Médio em Aberto</div>
            <div className={styles.comparisonDescription}>
              Média de tempo que os bugs permanecem abertos no backlog
            </div>
            <div className={styles.comparisonCount}>
              {totalOpenBugs} bugs abertos
            </div>
          </div>
          <div className={`${styles.comparisonCard} ${styles.resolutionTimeCard}`}>
            <div className={styles.comparisonIcon}>&#x2705;</div>
            <div className={styles.comparisonValue}>
              {formatTime(avgResolutionTime)}
            </div>
            <div className={styles.comparisonLabel}>Tempo Médio de Resolução</div>
            <div className={styles.comparisonDescription}>
              Média de tempo de trabalho para resolver um bug
            </div>
            <div className={styles.comparisonCount}>
              {totalResolvedBugs} bugs resolvidos
            </div>
          </div>
        </div>
      </div>
    );
  };

  const formatShortDate = (isoDateStr: string): string => {
    const [, month, day] = isoDateStr.split('-');
    return `${day}/${month}`;
  };

  const renderSprintProgressSlide = () => {
    const sprint = data.sprintData;
    if (!sprint) return null;

    const start = new Date(sprint.sprint.startDate).getTime();
    const end = new Date(sprint.sprint.endDate).getTime();
    const now = Date.now();
    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    const daysLeft = Math.max(0, Math.round((end - now) / 86400000));
    const daysElapsed = Math.max(0, Math.round((now - start) / 86400000));
    const scopeIncrease = sprint.currentCount - sprint.initialCount;

    return (
      <div className={styles.slideContent}>
        <h2 className={styles.slideTitle}>Progresso da Sprint</h2>
        <p className={styles.slideSubtitle}>{sprint.sprint.name}</p>

        <div className={styles.sprintKpiGrid}>
          <div className={styles.sprintKpiCard}>
            <div className={styles.sprintKpiValue}>{daysElapsed}</div>
            <div className={styles.sprintKpiLabel}>Dias Decorridos</div>
          </div>
          <div className={`${styles.sprintKpiCard} ${styles.sprintKpiHighlight}`}>
            <div className={styles.sprintKpiValue}>{daysLeft}</div>
            <div className={styles.sprintKpiLabel}>Dias Restantes</div>
          </div>
          <div className={styles.sprintKpiCard}>
            <div className={styles.sprintKpiValue}>{sprint.initialCount}</div>
            <div className={styles.sprintKpiLabel}>Escopo Inicial</div>
          </div>
          <div className={`${styles.sprintKpiCard} ${styles.sprintKpiCurrent}`}>
            <div className={styles.sprintKpiValue}>{sprint.currentCount}</div>
            <div className={styles.sprintKpiLabel}>
              Escopo Atual{scopeIncrease > 0 ? ` (+${scopeIncrease})` : ''}
            </div>
          </div>
        </div>

        <div className={styles.sprintProgressBar}>
          <div className={styles.sprintProgressHeader}>
            <span>Tempo da Sprint</span>
            <span className={styles.sprintProgressPct}>{Math.round(pct)}%</span>
          </div>
          <div className={styles.sprintProgressTrack}>
            <div className={styles.sprintProgressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  };

  const renderSprintScopeSlide = () => {
    const sprint = data.sprintData;
    if (!sprint) return null;

    return (
      <div className={styles.slideContent}>
        <h2 className={styles.slideTitle}>Crescimento do Escopo</h2>
        <p className={styles.slideSubtitle}>
          Quantidade de cards na sprint ao longo do tempo
        </p>
        <div className={styles.chartWrapper}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sprint.scopeHistory}
              margin={{ top: 20, right: 40, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={{ fill: '#e5e7eb', fontSize: 16 }}
                axisLine={{ stroke: '#4b5563' }}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#e5e7eb', fontSize: 16 }}
                axisLine={{ stroke: '#4b5563' }}
                width={48}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e5e7eb' }}
                labelFormatter={(l) => `Data: ${formatShortDate(l as string)}`}
                formatter={(v: number) => [v, 'Cards']}
              />
              {sprint.initialCount > 0 && (
                <ReferenceLine
                  y={sprint.initialCount}
                  stroke="#64748b"
                  strokeDasharray="6 3"
                  label={{ value: `Inicial: ${sprint.initialCount}`, fill: '#94a3b8', fontSize: 14, position: 'insideTopRight' }}
                />
              )}
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: '#3b82f6' }}
                name="Cards"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCurrentSlide = () => {
    switch (currentSlide) {
      case 'bug-stats':
        return renderStatsSlide(data.bugData, 'bugs');
      case 'bug-chart':
        return renderChartSlide(data.bugData, 'bugs');
      case 'bug-table':
        return renderTableSlide(data.bugData, 'bugs');
      case 'dev-stats':
        return renderStatsSlide(data.devData, 'dev');
      case 'dev-chart':
        return renderChartSlide(data.devData, 'dev');
      case 'dev-table':
        return renderTableSlide(data.devData, 'dev');
      case 'openBugs-stats':
        return renderStatsSlide(data.openBugsData, 'openBugs');
      case 'openBugs-chart':
        return renderChartSlide(data.openBugsData, 'openBugs');
      case 'openBugs-table':
        return renderTableSlide(data.openBugsData, 'openBugs');
      case 'bug-comparison':
        return renderComparisonSlide();
      case 'sprint-progress':
        return renderSprintProgressSlide();
      case 'sprint-scope':
        return renderSprintScopeSlide();
      default:
        return null;
    }
  };

  const getSlideLabel = (slide: SlideType): string => {
    const labels: Record<SlideType, string> = {
      'bug-stats': 'Bugs - Estatísticas',
      'bug-chart': 'Bugs - Gráfico',
      'bug-table': 'Bugs - Tabela',
      'openBugs-stats': 'Bugs Abertos - Estatísticas',
      'openBugs-chart': 'Bugs Abertos - Gráfico',
      'openBugs-table': 'Bugs Abertos - Tabela',
      'bug-comparison': 'Comparativo de Tempo',
      'dev-stats': 'DEV - Estatísticas',
      'dev-chart': 'DEV - Gráfico',
      'dev-table': 'DEV - Tabela',
      'sprint-progress': 'Sprint - Progresso',
      'sprint-scope': 'Sprint - Crescimento do Escopo',
    };
    return labels[slide];
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>KPI de Performance do Time</h1>
        <div className={styles.dateRange}>
          {data.dateRange.start} a {data.dateRange.end}
        </div>
      </header>

      <main className={styles.main}>
        {renderCurrentSlide()}
      </main>

      <footer className={styles.footer}>
        <div className={styles.slideIndicator}>
          <span className={styles.slideLabel}>{getSlideLabel(currentSlide)}</span>
          <span className={styles.slideCount}>
            {currentSlideIndex + 1} / {SLIDES.length}
          </span>
        </div>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={styles.controls}>
          <button onClick={prevSlide} className={styles.controlButton}>
            Anterior
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`${styles.controlButton} ${isPaused ? styles.pausedButton : ''}`}
          >
            {isPaused ? 'Continuar' : 'Pausar'}
          </button>
          <button onClick={nextSlide} className={styles.controlButton}>
            Próximo
          </button>
        </div>

        <div className={styles.shortcuts}>
          Atalhos: Espaço/Seta = Próximo | P = Pausar | ESC = Fechar
        </div>
      </footer>
    </div>
  );
};

export default PresentationMode;
