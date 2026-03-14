'use client';

import React, { useState } from 'react';
import { useEntity } from '@/hooks/useEntities';
import { useDocuments } from '@/hooks/useDocuments';
import { useRiskAnalysis } from '@/hooks/useRiskAnalysis';
import { useCAM } from '@/hooks/useCAM';
import { formatCurrency, formatDate, getStatusColor, getRiskColor } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, FileText, TrendingUp } from 'lucide-react';
import { CardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/shared/LoadingSkeleton';
import { StatusTracker } from '@/components/shared/StatusTracker';
import { AuditLog } from '@/components/shared/AuditLog';

export default function EntityDetailPage({ params }: { params: { id: string } }) {
  const { entity, isLoading: entityLoading } = useEntity(params.id);
  const { documents, isLoading: docsLoading } = useDocuments(params.id);
  const { riskAnalysis, isLoading: riskLoading } = useRiskAnalysis(params.id);
  const { cam, isLoading: camLoading } = useCAM(params.id);

  if (entityLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Entity not found</h2>
          <p className="text-gray-600">The requested entity does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{entity.companyName}</h1>
        <p className="text-gray-600 mt-1">{entity.registeredAddress}</p>
      </div>

      {/* Entity Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(entity.status)}>{entity.status}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getRiskColor(entity.riskScore || 0)}`}>
                {entity.riskScore || '-'}
              </span>
              <span className="text-gray-600">/100</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDate(entity.lastUpdated)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="cam">CAM</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entity Information */}
            <Card>
              <CardHeader>
                <CardTitle>Entity Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">CIN</p>
                    <p className="text-sm font-medium text-gray-900">{entity.cin}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">PAN</p>
                    <p className="text-sm font-medium text-gray-900">{entity.pan}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Sector</p>
                    <p className="text-sm font-medium text-gray-900">{entity.sector}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Incorporation Year</p>
                    <p className="text-sm font-medium text-gray-900">{entity.yearOfIncorporation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Snapshot */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Annual Turnover</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(entity.financialSnapshot.annualTurnover)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Net Profit</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(entity.financialSnapshot.netProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Assets</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(entity.financialSnapshot.totalAssets)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Total Debt</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(entity.financialSnapshot.totalDebt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Details */}
            <Card>
              <CardHeader>
                <CardTitle>Loan Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Loan Type</p>
                  <p className="text-sm font-medium text-gray-900">{entity.loanDetails.loanType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Loan Amount</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(entity.loanDetails.loanAmount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Interest Rate</p>
                    <p className="text-sm font-medium text-gray-900">{entity.loanDetails.interestRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Tenure</p>
                    <p className="text-sm font-medium text-gray-900">{entity.loanDetails.tenure} years</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Purpose</p>
                  <p className="text-sm font-medium text-gray-900">{entity.loanDetails.purpose}</p>
                </div>
              </CardContent>
            </Card>

            {/* Collateral */}
            <Card>
              <CardHeader>
                <CardTitle>Collateral Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Asset Type</p>
                  <p className="text-sm font-medium text-gray-900">{entity.collateral.assetType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Asset Value</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(entity.collateral.assetValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Security Coverage</p>
                  <p className="text-sm font-medium text-gray-900">{entity.collateral.securityCoverage}x</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audit Trail */}
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditLog />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          {docsLoading ? (
            <TableSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{documents.length} Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.fileName}</p>
                          <p className="text-xs text-gray-500">{doc.documentType}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial">
          <ChartSkeleton />
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk">
          {riskLoading ? (
            <ChartSkeleton />
          ) : riskAnalysis ? (
            <Card>
              <CardHeader>
                <CardTitle>Risk Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {riskAnalysis.categories.map((cat) => (
                    <div key={cat.name} className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-xs font-medium text-gray-600">{cat.name}</p>
                      <p className={`text-2xl font-bold mt-2 ${getRiskColor(cat.score)}`}>
                        {cat.score}
                      </p>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">AI Reasoning</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{riskAnalysis.aiReasoning}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* CAM Tab */}
        <TabsContent value="cam">
          {camLoading ? (
            <ChartSkeleton />
          ) : cam ? (
            <Card>
              <CardHeader>
                <CardTitle>Credit Assessment Memorandum</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">CAM Status: {cam.status}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Generated: {formatDate(cam.generatedAt)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
