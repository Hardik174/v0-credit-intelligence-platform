'use client';

import React from 'react';
import { useResearch } from '@/hooks/useResearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import { ChartSkeleton } from '@/components/shared/LoadingSkeleton';
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

export default function ResearchPage() {
  const { insights, sectorTrends, macroIndicators, isLoading } = useResearch();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive':
        return 'bg-green-100 text-green-700';
      case 'Negative':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Research Insights</h1>
        <p className="text-gray-600 mt-1">AI-powered secondary research and market intelligence</p>
      </div>

      {/* Sector Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Sector Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={sectorTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sectorIndex"
                stroke="#ef4444"
                name="Sector Index"
                strokeWidth={2}
                dot={{ fill: '#ef4444', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="entityPerformance"
                stroke="#3b82f6"
                name="Entity Performance"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Macro Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Macroeconomic Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {macroIndicators.map((indicator) => (
              <div key={indicator.name} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-gray-900">{indicator.name}</p>
                  {getTrendIcon(indicator.trend)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{indicator.value}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {indicator.change > 0 ? '+' : ''}{indicator.change} change
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Research Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Research ({insights.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 leading-tight">{insight.headline}</h4>
                  <p className="text-xs text-gray-500 mt-1">{insight.source}</p>
                </div>
                <Badge className={getSentimentColor(insight.sentiment)}>
                  {insight.sentiment}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">{insight.summary}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {new Date(insight.publishedAt).toLocaleDateString()}
                </span>
                {insight.url && (
                  <a href={insight.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
