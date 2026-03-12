import React from 'react';
import { RiskSignal } from '@/types/research';
import { AlertCircle, TrendingDown } from 'lucide-react';

interface RiskSignalCardProps {
  signal: RiskSignal;
}

export function RiskSignalCard({ signal }: RiskSignalCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Low':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-700',
          icon: 'text-green-600',
        };
      case 'Medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-700',
          icon: 'text-yellow-600',
        };
      case 'High':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-700',
          icon: 'text-red-600',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-700',
          icon: 'text-gray-600',
        };
    }
  };

  const colors = getRiskColor(signal.riskLevel);

  return (
    <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{signal.title}</h4>
        <AlertCircle className={`w-5 h-5 ${colors.icon}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{signal.value}</p>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-medium px-2 py-1 rounded ${colors.badge}`}>
          {signal.riskLevel} Risk
        </span>
      </div>
      <p className="text-sm text-gray-600">{signal.description}</p>
    </div>
  );
}
