import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { formatNumber } from '../../utils/formatters';

interface ScenarioComparisonChartProps {
  baselinePm25: number;
  counterfactualPm25: number;
  stationName: string;
  height?: number;
}

export const ScenarioComparisonChart: React.FC<ScenarioComparisonChartProps> = ({
  baselinePm25,
  counterfactualPm25,
  stationName,
  height = 260,
}) => {
  const delta = counterfactualPm25 - baselinePm25;
  const reduction = -delta;
  const pctChange = baselinePm25 > 0 ? (delta / baselinePm25) * 100 : 0;

  const data = [
    {
      category: 'Baseline PM2.5',
      pm25: baselinePm25,
      type: 'BASELINE',
    },
    {
      category: 'Counterfactual PM2.5',
      pm25: counterfactualPm25,
      type: 'COUNTERFACTUAL',
    },
  ];

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Target Location: <strong>{stationName}</strong>
        </span>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
          <span>
            Simulated Delta:{' '}
            <strong style={{ color: delta < 0 ? '#10b981' : '#f59e0b' }}>
              {delta < 0 ? '▼ ' : '▲ '}
              {formatNumber(Math.abs(reduction), 2)} µg/m³ ({formatNumber(pctChange, 2)}%)
            </strong>
          </span>
        </div>
      </div>

      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="category" stroke="#64748b" fontSize={12} tickLine={false} dy={8} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit=" µg/m³" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                color: '#0f172a',
              }}
              formatter={(val: unknown) => [`${formatNumber(Number(val), 2)} µg/m³`, 'PM2.5 Concentration']}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
            <Bar dataKey="pm25" name="PM2.5 (µg/m³)" radius={[6, 6, 0, 0]} barSize={55}>
              <Cell fill="#94a3b8" />
              <Cell fill="#2563eb" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
