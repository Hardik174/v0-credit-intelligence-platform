'use client';

import React from 'react';
import { formatDate } from '@/lib/utils';
import { Clock, User } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

const mockAuditLog: AuditEntry[] = [
  {
    id: '1',
    action: 'Entity Created',
    user: 'Rahul Agarwal',
    timestamp: '2024-01-10T09:00:00Z',
    details: 'Created entity: Tata Steel Limited',
  },
  {
    id: '2',
    action: 'Document Uploaded',
    user: 'Rahul Agarwal',
    timestamp: '2024-01-11T10:00:00Z',
    details: 'Uploaded: tata_steel_alm_2024.pdf',
  },
  {
    id: '3',
    action: 'Extraction Approved',
    user: 'Priya Sharma',
    timestamp: '2024-01-12T14:30:00Z',
    details: 'Approved extraction for ALM Report',
  },
  {
    id: '4',
    action: 'Risk Analysis Generated',
    user: 'System',
    timestamp: '2024-01-13T08:00:00Z',
    details: 'AI risk score: 72/100',
  },
  {
    id: '5',
    action: 'CAM Section Edited',
    user: 'Rahul Agarwal',
    timestamp: '2024-01-15T11:00:00Z',
    details: 'Edited: Executive Summary',
  },
];

export function AuditLog() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Audit Trail</h3>
      <div className="space-y-3">
        {mockAuditLog.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              {entry.user === 'System' ? (
                <Clock className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <User className="w-3.5 h-3.5 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{entry.action}</p>
              {entry.details && (
                <p className="text-xs text-gray-500 mt-0.5">{entry.details}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{entry.user}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">
                  {formatDate(entry.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
