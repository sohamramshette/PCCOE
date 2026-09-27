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
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} dy={10} />
            <YAxis yAxisId="left" stroke="#2563eb" fontSize={11} tickLine={false} unit="°C" />
            <YAxis yAxisId="right" orientation="right" stroke="#f97316" fontSize={11} tickLine={false} unit="%" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#0f172a',
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
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="humidity"
              name="Humidity"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="wind"
              name="Wind Speed"
              stroke="#059669"
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
