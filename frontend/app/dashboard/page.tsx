'use client';

import React, { useState } from 'react';
import { useEntities } from '@/hooks/useEntities';
import { formatCurrency, getStatusColor, getRiskColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight, TrendingUp, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { CardSkeleton, TableSkeleton } from '@/components/shared/LoadingSkeleton';

export default function DashboardPage() {
  const { entities, isLoading } = useEntities();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton />
      </div>
    );
  }

  const totalEntities = entities.length;
  const loansUnderReview = entities.filter((e) => e.status === 'Under Analysis').length;
  const averageRiskScore = entities.reduce((sum, e) => sum + (e.riskScore || 0), 0) / entities.length;
  const pendingReviews = entities.filter((e) => e.status === 'Documents Pending').length;

  const stats = [
    { label: 'Total Entities', value: totalEntities, icon: FileText, color: 'bg-blue-100 text-blue-600' },
    { label: 'Under Review', value: loansUnderReview, icon: AlertCircle, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Avg Risk Score', value: `${averageRiskScore.toFixed(0)}/100`, icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
    { label: 'Pending Reviews', value: pendingReviews, icon: CheckCircle, color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your credit assessment overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.label}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assessment Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Credit Assessments</CardTitle>
            <Link href="/entities">
              <Button variant="outline" size="sm">
                View All <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Entity Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Sector</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Loan Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Risk Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {entities.slice(0, 5).map((entity) => (
                  <tr key={entity.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link href={`/entities/${entity.id}`} className="font-medium text-blue-600 hover:underline">
                        {entity.companyName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{entity.sector}</td>
                    <td className="py-3 px-4 text-gray-600">{formatCurrency(entity.loanDetails.loanAmount)}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(entity.status)}>
                        {entity.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${getRiskColor(entity.riskScore || 0)}`}>
                        {entity.riskScore || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(entity.lastUpdated).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
