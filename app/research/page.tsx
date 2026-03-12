'use client';

import React from 'react';
import { useResearch } from '@/hooks/useResearch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartSkeleton } from '@/components/shared/LoadingSkeleton';
import { SectorTrendChart } from '@/components/research/SectorTrendChart';
import { MacroIndicatorCard } from '@/components/research/MacroIndicatorCard';
import { RiskSignalCard } from '@/components/research/RiskSignalCard';
import { InsightSummaryCard } from '@/components/research/InsightSummaryCard';
import { ResearchArticleCard } from '@/components/research/ResearchArticleCard';

export default function ResearchPage() {
  const {
    insights,
    sectorTrends,
    macroIndicators,
    riskSignals,
    aiInsight,
    isLoading,
    regenerateInsight,
  } = useResearch();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Research Insights</h1>
        <p className="text-gray-600 mt-1">AI-powered secondary research and market intelligence</p>
      </div>

      {/* Sector Trends Chart */}
      <Card>
        <CardContent className="pt-6">
          <SectorTrendChart
            data={sectorTrends}
            riskLevel="Medium"
            isLoading={isLoading}
          />
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
              <MacroIndicatorCard
                key={indicator.name}
                indicator={indicator}
                isLoading={isLoading}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Signals Section */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Signals</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            AI-detected external risk indicators affecting the borrower and sector
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {riskSignals.map((signal) => (
              <RiskSignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insight Summary */}
      {aiInsight && (
        <InsightSummaryCard
          insight={aiInsight}
          onRegenerate={regenerateInsight}
          isLoading={isLoading}
        />
      )}

      {/* Latest Research Articles */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Research ({insights.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            insights.map((insight) => (
              <ResearchArticleCard key={insight.id} article={insight} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
