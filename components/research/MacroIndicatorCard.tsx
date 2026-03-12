import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MacroIndicator } from '@/types/research';

interface MacroIndicatorCardProps {
  indicator: MacroIndicator;
  isLoading?: boolean;
}

export function MacroIndicatorCard({ indicator, isLoading }: MacroIndicatorCardProps) {
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

  if (isLoading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2 animate-pulse" />
        <div className="h-6 bg-gray-200 rounded mb-2 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium text-gray-900 text-sm">{indicator.name}</p>
        {getTrendIcon(indicator.trend)}
      </div>
      <p className="text-2xl font-bold text-gray-900">{indicator.value}</p>
      <p className={`text-xs mt-1 font-medium ${indicator.change > 0 ? 'text-green-600' : indicator.change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
        {indicator.change > 0 ? '+' : ''}{indicator.change} {indicator.change !== 0 ? 'change' : 'stable'}
      </p>
    </div>
  );
}
