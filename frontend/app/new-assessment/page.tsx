'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NewAssessmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Credit Assessment</h1>
        <p className="text-gray-600 mt-1">Start a new credit assessment process</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Standard Assessment',
                description: 'Complete credit assessment with full documentation',
              },
              {
                title: 'Quick Assessment',
                description: 'Quick credit check with minimal documentation',
              },
            ].map((type) => (
              <div
                key={type.title}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              >
                <h3 className="font-semibold text-gray-900">{type.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                <Button size="sm" className="mt-3">
                  Start <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
