import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { formatNumber } from '../../utils/formatters';

export interface ChartDataPoint {
  timestamp: string;
  label: string;
  observed?: number | null;
  predicted?: number | null;
}

interface Pm25TimeSeriesChartProps {
  data: ChartDataPoint[];
  height?: number;
  title?: string;
  showLegend?: boolean;
}

export const Pm25TimeSeriesChart: React.FC<Pm25TimeSeriesChartProps> = ({
  data,
  height = 320,
  title,
  showLegend = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="state-container" style={{ height }}>
        <span>No chronological time-series points available for this period.</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {title && (
        <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </div>
      )}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              dx={-5}
              unit=" µg/m³"
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#0f172a',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
              }}
              formatter={(value: unknown, name: unknown) => {
                if (value === null || value === undefined) return ['No Data (Offline)', String(name)];
                return [`${formatNumber(Number(value), 1)} µg/m³`, String(name)];
              }}
              labelFormatter={(label) => `Time: ${label}`}
            />
            {showLegend && (
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
            )}
            {/* Note: connectNulls is intentionally FALSE so missing observed measurements remain visibly missing */}
            <Line
              type="monotone"
              dataKey="observed"
              name="Observed PM2.5 (Sensor)"
              stroke="#059669"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#059669' }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted PM2.5 (Model)"
              stroke="#2563eb"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 5 }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
