'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Clock, Loader2 } from 'lucide-react';
import { PROCESSING_STAGES } from '@/lib/constants';

interface StatusTrackerProps {
  currentStage: string;
  className?: string;
}

export function StatusTracker({ currentStage, className }: StatusTrackerProps) {
  const currentIndex = PROCESSING_STAGES.indexOf(currentStage as any);

  return (
    <div className={cn('flex items-center', className)}>
      {PROCESSING_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <React.Fragment key={stage}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isCompleted && 'bg-green-100 text-green-700',
                  isCurrent && 'bg-blue-100 text-blue-700 ring-2 ring-blue-200',
                  isPending && 'bg-gray-100 text-gray-400'
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium hidden sm:block',
                  isCompleted && 'text-green-700',
                  isCurrent && 'text-blue-700',
                  isPending && 'text-gray-400'
                )}
              >
                {stage}
              </span>
            </div>
            {index < PROCESSING_STAGES.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 rounded',
                  index < currentIndex ? 'bg-green-300' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
