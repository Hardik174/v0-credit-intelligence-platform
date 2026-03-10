'use client';

import React from 'react';
import { useExtraction } from '@/hooks/useExtraction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfidenceIndicator } from '@/components/shared/ConfidenceIndicator';
import { TableSkeleton } from '@/components/shared/LoadingSkeleton';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ExtractionPage() {
  const { extraction, isLoading } = useExtraction();

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!extraction) {
    return <div>No extraction data available</div>;
  }

  const flaggedFields = extraction.extractedData.filter((f) => f.isFlagged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Extraction Review</h1>
        <p className="text-gray-600 mt-1">Review and validate extracted data from documents</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="capitalize">
              {extraction.status.replace('_', ' ')}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overall Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfidenceIndicator confidence={extraction.confidence} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Flagged Fields</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{flaggedFields.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Extracted Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Fields ({extraction.extractedData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {extraction.extractedData.map((field) => (
              <div
                key={field.id}
                className={`p-3 rounded-lg border ${
                  field.isFlagged ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{field.fieldName}</p>
                      {field.isFlagged && (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                      {!field.isFlagged && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{field.value}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">{field.source}</span>
                      <ConfidenceIndicator confidence={field.confidence} showLabel={true} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Tables */}
      {extraction.tables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Tables ({extraction.tables.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {extraction.tables.map((table) => (
              <div key={table.id}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{table.tableName}</h4>
                  <ConfidenceIndicator confidence={table.confidence} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-100">
                        {table.headers.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <tr key={row.id} className="border-t border-gray-200">
                          {row.cells.map((cell, i) => (
                            <td key={i} className="px-3 py-2 text-gray-600">
                              {cell.value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
