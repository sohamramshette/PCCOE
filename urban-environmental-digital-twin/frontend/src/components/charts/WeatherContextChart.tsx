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
import { WeatherItem } from '../../types/weather';
import { formatNumber, parseUtcDate, isWithinCanonicalPeriod } from '../../utils/formatters';

interface WeatherContextChartProps {
  data: WeatherItem[];
  height?: number;
}

export const WeatherContextChart: React.FC<WeatherContextChartProps> = ({ data, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="state-container" style={{ height }}>
        <span>No meteorological reanalysis points available.</span>
      </div>
    );
  }

  const sortedData = [...data]
    .filter((d) => isWithinCanonicalPeriod(d.datetime_utc))
    .sort((a, b) => parseUtcDate(a.datetime_utc).getTime() - parseUtcDate(b.datetime_utc).getTime());

  const chartData = sortedData.map((d) => {
    const time = parseUtcDate(d.datetime_utc);
    const hourLabel = isNaN(time.getTime())
      ? d.datetime_utc
      : `${time.getUTCDate()} ${time.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${time.getUTCHours().toString().padStart(2, '0')}:00`;
    return {
      label: hourLabel,
      temp: d.temp_c,
      humidity: d.humidity_pct,
      wind: d.wind_speed_ms,
      pblh: d.pbl_height_m,
    };
  });

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} dy={10} />
            <YAxis yAxisId="left" stroke="#38bdf8" fontSize={11} tickLine={false} unit="°C" />
            <YAxis yAxisId="right" orientation="right" stroke="#a78bfa" fontSize={11} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#151e2e',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#f8fafc',
              }}
              formatter={(val: unknown, name: unknown) => {
                if (name === 'Temperature') return [`${formatNumber(Number(val), 1)} °C`, 'Temperature'];
                if (name === 'Humidity') return [`${formatNumber(Number(val), 1)} %`, 'Humidity'];
                if (name === 'Wind Speed') return [`${formatNumber(Number(val), 2)} m/s`, 'Wind Speed'];
                return [String(val), String(name)];
              }}
            />
            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temp"
              name="Temperature"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="humidity"
              name="Humidity"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="wind"
              name="Wind Speed"
              stroke="#fbbf24"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
