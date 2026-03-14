'use client';

import React, { useState } from 'react';
import { useEntities } from '@/hooks/useEntities';
import { formatCurrency, getStatusColor, getRiskColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TableSkeleton } from '@/components/shared/LoadingSkeleton';

export default function EntitiesPage() {
  const { entities, isLoading } = useEntities();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntities = entities.filter(
    (e) =>
      e.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sector.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <TableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entities</h1>
          <p className="text-gray-600 mt-1">Manage all credit entities and assessments</p>
        </div>
        <Link href="/new-assessment">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by company name or sector..."
          className="pl-10 h-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{filteredEntities.length} Entities Found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Company Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Sector</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Turnover</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Loan Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Risk Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody>
                {filteredEntities.map((entity) => (
                  <tr
                    key={entity.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-gray-900">{entity.companyName}</p>
                        <p className="text-xs text-gray-500">{entity.cin}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{entity.sector}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatCurrency(entity.financialSnapshot.annualTurnover)}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatCurrency(entity.loanDetails.loanAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(entity.status)}>
                        {entity.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${getRiskColor(entity.riskScore || 0)}`}>
                        {entity.riskScore || '-'}/100
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/entities/${entity.id}`}>
                        <Button variant="ghost" size="sm">
                          View <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
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
