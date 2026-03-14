'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceIndicator({
  confidence,
  size = 'sm',
  showLabel = true,
}: ConfidenceIndicatorProps) {
  const getColor = (conf: number) => {
    if (conf >= 90) return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
    if (conf >= 75) return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' };
    if (conf >= 60) return { bg: 'bg-orange-100', text: 'text-orange-700', bar: 'bg-orange-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
  };

  const colors = getColor(confidence);
  const sizeClasses = {
    sm: 'h-1.5 w-16',
    md: 'h-2 w-24',
    lg: 'h-2.5 w-32',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn('bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all', colors.bar)}
          style={{ width: `${confidence}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', colors.text)}>
          {confidence}%
        </span>
      )}
    </div>
  );
}
