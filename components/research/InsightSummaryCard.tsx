import React, { useState } from 'react';
import { Zap, Loader } from 'lucide-react';
import { AIInsightSummary } from '@/types/research';

interface InsightSummaryCardProps {
  insight: AIInsightSummary;
  onRegenerate?: () => Promise<void>;
  isLoading?: boolean;
}

export function InsightSummaryCard({
  insight,
  onRegenerate,
  isLoading: externalLoading = false,
}: InsightSummaryCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!onRegenerate) return;
    setIsRegenerating(true);
    try {
      await onRegenerate();
    } finally {
      setIsRegenerating(false);
    }
  };

  const loading = externalLoading || isRegenerating;

  return (
    <div className="p-6 rounded-lg border border-blue-200 bg-blue-50">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Credit Intelligence Summary</h3>
        </div>
        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Regenerate Insight
              </>
            )}
          </button>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 bg-blue-100 rounded animate-pulse" />
          <div className="h-4 bg-blue-100 rounded animate-pulse" />
          <div className="h-4 bg-blue-100 rounded animate-pulse w-3/4" />
        </div>
      ) : (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">{insight.summary}</p>
          <p className="text-xs text-gray-500">
            Generated: {new Date(insight.timestamp).toLocaleDateString()} at{' '}
            {new Date(insight.timestamp).toLocaleTimeString()}
          </p>
        </>
      )}
    </div>
  );
}
