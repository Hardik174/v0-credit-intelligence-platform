'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';

export default function SchemaBuilderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schema Builder</h1>
          <p className="text-gray-600 mt-1">Define custom financial data schemas</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Schema
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Default Schemas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Financial Statements', fields: 12 },
              { name: 'Shareholding Structure', fields: 8 },
              { name: 'Borrowing Profile', fields: 6 },
              { name: 'ALM Buckets', fields: 15 },
              { name: 'Portfolio Metrics', fields: 10 },
            ].map((schema) => (
              <div
                key={schema.name}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{schema.name}</p>
                  <p className="text-sm text-gray-500">{schema.fields} fields</p>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
