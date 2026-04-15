'use client'

import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import Link from 'next/link';
import styles from './page.module.css';

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

const formatDate = (isoString: string): string => {
  const d = new Date(isoString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatShortDate = (isoDateStr: string): string => {
  const [, month, day] = isoDateStr.split('-');
  return `${day}/${month}`;
};

const SprintPage: React.FC = () => {
  const [data, setData] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/jira-sprint');
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sprintProgress = (() => {
    if (!data) return { pct: 0, daysElapsed: 0, daysTotal: 0, daysLeft: 0 };
    const start = new Date(data.sprint.startDate).getTime();
    const end = new Date(data.sprint.endDate).getTime();
    const now = Date.now();
    const daysTotal = Math.round((end - start) / 86400000);
    const daysElapsed = Math.max(0, Math.round((now - start) / 86400000));
    const daysLeft = Math.max(0, Math.round((end - now) / 86400000));
    const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    return { pct, daysElapsed, daysTotal, daysLeft };
  })();

  const scopeIncrease = data ? data.currentCount - data.initialCount : 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>
          Voltar
        </Link>
        <div className={styles.headerCenter}>
          <h1 className={styles.title}>Progresso da Sprint</h1>
          {data && <span className={styles.sprintName}>{data.sprint.name}</span>}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className={styles.refreshButton}
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </header>

      {error && <div className={styles.error}>Erro: {error}</div>}

      {loading && !data && (
        <div className={styles.loadingState}>Carregando dados da sprint...</div>
      )}

      {data && (
        <main className={styles.main}>
          {/* KPI cards */}
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Início</div>
              <div className={styles.kpiValue}>{formatDate(data.sprint.startDate)}</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiLabel}>Fim</div>
              <div className={styles.kpiValue}>{formatDate(data.sprint.endDate)}</div>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiDaysLeft}`}>
              <div className={styles.kpiLabel}>Dias Restantes</div>
              <div className={styles.kpiValueLarge}>{sprintProgress.daysLeft}</div>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiInitial}`}>
              <div className={styles.kpiLabel}>Escopo Inicial</div>
              <div className={styles.kpiValueLarge}>{data.initialCount}</div>
              <div className={styles.kpiSub}>cards no início</div>
            </div>
            <div className={`${styles.kpiCard} ${styles.kpiCurrent}`}>
              <div className={styles.kpiLabel}>Escopo Atual</div>
              <div className={styles.kpiValueLarge}>{data.currentCount}</div>
              {scopeIncrease > 0 && (
                <div className={styles.kpiDelta}>+{scopeIncrease} adicionados</div>
              )}
            </div>
          </div>

          {/* Sprint time progress bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <span className={styles.progressTitle}>Progresso da Sprint</span>
              <span className={styles.progressPct}>{Math.round(sprintProgress.pct)}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${sprintProgress.pct}%` }}
              />
            </div>
            <div className={styles.progressFooter}>
              <span>{sprintProgress.daysElapsed} dias decorridos</span>
              <span>{sprintProgress.daysLeft} dias restantes</span>
            </div>
          </div>

          {/* Scope growth chart */}
          <div className={styles.chartSection}>
            <h2 className={styles.chartTitle}>Crescimento do Escopo</h2>
            <p className={styles.chartSubtitle}>
              Quantidade de cards na sprint ao longo do tempo
            </p>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.scopeHistory}
                  margin={{ top: 16, right: 32, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fill: '#94a3b8', fontSize: 13 }}
                    axisLine={{ stroke: '#475569' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#94a3b8', fontSize: 13 }}
                    axisLine={{ stroke: '#475569' }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: 8,
                      color: '#e5e7eb',
                    }}
                    labelFormatter={(label) => `Data: ${formatShortDate(label as string)}`}
                    formatter={(value: number) => [value, 'Cards']}
                  />
                  {data.initialCount > 0 && (
                    <ReferenceLine
                      y={data.initialCount}
                      stroke="#64748b"
                      strokeDasharray="6 3"
                      label={{
                        value: `Inicial: ${data.initialCount}`,
                        fill: '#64748b',
                        fontSize: 12,
                        position: 'insideTopRight',
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6' }}
                    name="Cards"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default SprintPage;
