import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { SectorTrend, RiskLevel } from '@/types/research';
import { ChartSkeleton } from '@/components/shared/LoadingSkeleton';

interface SectorTrendChartProps {
  data: SectorTrend[];
  riskLevel?: RiskLevel;
  isLoading?: boolean;
}

export function SectorTrendChart({ data, riskLevel = 'Medium', isLoading }: SectorTrendChartProps) {
  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case 'Low':
        return 'bg-green-100 text-green-700';
      case 'High':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-yellow-100 text-yellow-700';
    }
  };

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sector Performance Trends</h3>
        <span className={`text-xs font-medium px-3 py-1 rounded ${getRiskColor(riskLevel)}`}>
          Sector Risk: {riskLevel}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value) => value}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="sectorIndex"
            stroke="#ef4444"
            name="Sector Index"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="entityPerformance"
            stroke="#3b82f6"
            name="Entity Performance"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
