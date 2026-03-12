'use client';

/**
 * app/results/page.tsx
 *
 * Displays the full FullAnalysisResponse stored in sessionStore after
 * a successful /extract-data run from the onboarding pipeline.
 *
 * Sections:
 *   1. Entity & Loan Summary
 *   2. Risk Score (color-coded gauge)
 *   3. Fraud Flags (detailed cards per flag)
 *   4. GST Analysis metrics
 *   5. Bank Analysis metrics
 *   6. Financial Commitments
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Banknote,
  FileText,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionStore } from '@/store/sessionStore';
import type { FraudFlag, RiskLevel } from '@/types/analysis';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)} K`;
  return `₹${n.toFixed(2)}`;
}

function riskColor(level: RiskLevel) {
  switch (level) {
    case 'Low':      return 'text-green-700 bg-green-50 border-green-200';
    case 'Moderate': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'High':     return 'text-red-700 bg-red-50 border-red-200';
  }
}

function riskScoreColor(score: number) {
  if (score <= 30) return 'text-green-600';
  if (score <= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function riskBarColor(score: number) {
  if (score <= 30) return 'bg-green-500';
  if (score <= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

function fraudFlagIcon(flag: string | undefined) {
  const f = flag ?? '';
  if (f.includes('INFLATION'))    return <TrendingUp className="w-4 h-4 text-orange-500" />;
  if (f.includes('CIRCULAR'))     return <RefreshCcw className="w-4 h-4 text-red-500" />;
  if (f.includes('DENSE'))        return <BarChart3 className="w-4 h-4 text-purple-500" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
}

function fraudFlagBadgeClass(flag: string | undefined) {
  const f = flag ?? '';
  if (f.includes('INFLATION')) return 'bg-orange-50 text-orange-700 border-orange-200';
  if (f.includes('CIRCULAR'))  return 'bg-red-50 text-red-700 border-red-200';
  if (f.includes('DENSE'))     return 'bg-purple-50 text-purple-700 border-purple-200';
  return 'bg-yellow-50 text-yellow-700 border-yellow-200';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="mt-0.5 text-gray-400">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function FraudFlagCard({ ff }: { ff: FraudFlag }) {
  const flagStr = ff.flag ?? '';
  return (
    <div
      className={cn(
        'border rounded-lg p-4 space-y-2',
        flagStr.includes('INFLATION')
          ? 'border-orange-200 bg-orange-50'
          : flagStr.includes('CIRCULAR')
          ? 'border-red-200 bg-red-50'
          : flagStr.includes('DENSE')
          ? 'border-purple-200 bg-purple-50'
          : 'border-yellow-200 bg-yellow-50'
      )}
    >
      <div className="flex items-center gap-2">
        {fraudFlagIcon(flagStr)}
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded border',
            fraudFlagBadgeClass(flagStr)
          )}
        >
          {flagStr || 'UNKNOWN'}
        </span>
      </div>
      <p className="text-sm text-gray-700">{ff.description}</p>

      {/* Revenue inflation specifics */}
      {ff.gst_revenue !== undefined && (
        <div className="grid grid-cols-3 gap-2 text-xs mt-1">
          <div className="text-center p-2 bg-white rounded border border-orange-100">
            <p className="text-gray-500">GST Revenue</p>
            <p className="font-semibold text-gray-800">{formatNumber(ff.gst_revenue ?? 0)}</p>
          </div>
          <div className="text-center p-2 bg-white rounded border border-orange-100">
            <p className="text-gray-500">Bank Inflow</p>
            <p className="font-semibold text-gray-800">{formatNumber(ff.bank_inflow ?? 0)}</p>
          </div>
          <div className="text-center p-2 bg-white rounded border border-orange-100">
            <p className="text-gray-500">Ratio</p>
            <p className="font-semibold text-red-700">{ff.ratio != null ? `${ff.ratio.toFixed(2)}x` : '–'}</p>
          </div>
        </div>
      )}

      {/* Circular trading specifics */}
      {ff.cycle_count !== undefined && (
        <div className="text-xs space-y-1 mt-1">
          <p className="text-gray-600">
            <span className="font-medium">{ff.cycle_count}</span> circular trading cycle
            {ff.cycle_count !== 1 ? 's' : ''} detected.
          </p>
          {ff.sample_cycles && ff.sample_cycles.length > 0 && (
            <div className="space-y-1">
              <p className="text-gray-500 font-medium">Sample cycles:</p>
              {ff.sample_cycles.slice(0, 3).map((cycle, i) => (
                <p key={i} className="font-mono bg-white px-2 py-1 rounded border border-red-100 truncate">
                  {cycle.join(' → ')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dense subgraph specifics */}
      {ff.groups && ff.groups.length > 0 && (
        <div className="text-xs space-y-1 mt-1">
          <p className="text-gray-500 font-medium">Suspicious groups:</p>
          {ff.groups.slice(0, 3).map((g, i) => (
            <div key={i} className="bg-white rounded border border-purple-100 px-2 py-1">
              <p className="truncate">{g.nodes.join(', ')}</p>
              <p className="text-gray-400">
                density: <span className="font-medium text-purple-700">{g.density.toFixed(2)}</span>
                {' · '}edges: {g.edges}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ResultsPage() {
  const router = useRouter();
  const { analysisResult, sessionId, reset } = useSessionStore();

  if (!analysisResult) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No analysis results found. Please complete the onboarding pipeline first.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push('/onboarding')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go to Onboarding
        </Button>
      </div>
    );
  }

  const { entity_profile, loan_details, financial_analysis } = analysisResult;
  const {
    financial_commitments,
    gst_analysis,
    bank_analysis,
    fraud_flags,
    risk_score,
    risk_level,
  } = financial_analysis;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
          <p className="text-gray-500 mt-1">
            Credit intelligence report for{' '}
            <span className="font-medium text-gray-700">{entity_profile.company_name}</span>
          </p>
          {sessionId && (
            <p className="text-xs text-gray-400 mt-0.5 font-mono">Session: {sessionId}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/onboarding')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-red-500"
            onClick={() => {
              reset();
              router.push('/onboarding');
            }}
          >
            Clear & Reset
          </Button>
        </div>
      </div>

      {/* ── 1. Entity & Loan Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <Building2 className="w-4 h-4 text-blue-600" />
              Entity Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Company</span>
              <span className="font-medium text-gray-800">{entity_profile.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">CIN</span>
              <span className="font-mono text-xs text-gray-700">{entity_profile.cin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PAN</span>
              <span className="font-mono text-xs text-gray-700">{entity_profile.pan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sector</span>
              <span className="text-gray-700">{entity_profile.sector}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Turnover</span>
              <span className="text-gray-700">{entity_profile.turnover}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Loan Type</span>
              <span className="font-medium text-gray-800">{loan_details.loan_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount</span>
              <span className="text-gray-700">{loan_details.loan_amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tenure</span>
              <span className="text-gray-700">{loan_details.tenure}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest Rate</span>
              <span className="text-gray-700">{loan_details.interest_rate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 2. Risk Score ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {risk_level === 'High' ? (
              <ShieldAlert className="w-5 h-5 text-red-600" />
            ) : risk_level === 'Moderate' ? (
              <ShieldAlert className="w-5 h-5 text-yellow-600" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-green-600" />
            )}
            Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div>
              <p className={cn('text-6xl font-bold', riskScoreColor(risk_score))}>
                {risk_score}
              </p>
              <p className="text-sm text-gray-400">/ 100</p>
            </div>
            <div className="flex-1 space-y-2 pb-1">
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={cn('h-3 rounded-full transition-all', riskBarColor(risk_score))}
                  style={{ width: `${risk_score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>0 – Low</span>
                <span>30 – Moderate</span>
                <span>60 – High →</span>
              </div>
            </div>
            <Badge
              className={cn(
                'text-sm px-3 py-1 border font-semibold',
                riskColor(risk_level)
              )}
              variant="outline"
            >
              {risk_level} Risk
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Fraud Flags ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Fraud Detection
            <Badge
              variant="outline"
              className={cn(
                'ml-auto text-xs',
                fraud_flags.length === 0
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              )}
            >
              {fraud_flags.length === 0
                ? 'No flags detected'
                : `${fraud_flags.length} flag${fraud_flags.length !== 1 ? 's' : ''} detected`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fraud_flags.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg border border-green-100">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <p className="text-sm text-green-700">
                No fraud patterns identified in the submitted documents.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {fraud_flags.map((ff, i) => (
                <FraudFlagCard key={i} ff={ff} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 4. GST Analysis + 5. Bank Analysis ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <FileText className="w-4 h-4 text-blue-600" />
              GST Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Total Invoice Value"
              value={formatNumber(gst_analysis.total_invoice_value)}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              label="Invoice Count"
              value={gst_analysis.invoice_count.toLocaleString()}
              icon={<FileText className="w-4 h-4" />}
            />
            <MetricCard
              label="Unique Buyers"
              value={gst_analysis.unique_buyers.toLocaleString()}
              icon={<Building2 className="w-4 h-4" />}
            />
            {gst_analysis.unique_sellers !== undefined && (
              <MetricCard
                label="Unique Sellers"
                value={gst_analysis.unique_sellers.toLocaleString()}
                icon={<Building2 className="w-4 h-4" />}
              />
            )}
            {gst_analysis.top_buyers && gst_analysis.top_buyers.length > 0 && (
              <div className="col-span-2 mt-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Top Buyers</p>
                <div className="space-y-1">
                  {gst_analysis.top_buyers.slice(0, 3).map((b) => (
                    <div
                      key={b.gstin}
                      className="flex justify-between items-center text-xs bg-gray-50 rounded px-2 py-1.5"
                    >
                      <span className="font-mono text-gray-600 truncate max-w-[120px]">
                        {b.gstin}
                      </span>
                      <span className="font-medium text-gray-800">
                        {formatNumber(b.total_value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
              <Banknote className="w-4 h-4 text-blue-600" />
              Bank Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Credit Inflow"
              value={formatNumber(bank_analysis.total_credit_inflow)}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              label="Debit Outflow"
              value={formatNumber(bank_analysis.total_debit_outflow)}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              label="Net Flow"
              value={formatNumber(bank_analysis.net_flow)}
              sub={bank_analysis.net_flow >= 0 ? 'Positive' : 'Negative'}
              icon={<Banknote className="w-4 h-4" />}
            />
            <MetricCard
              label="Transactions"
              value={bank_analysis.transaction_count.toLocaleString()}
              icon={<BarChart3 className="w-4 h-4" />}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Financial Commitments ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            Financial Commitments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              { label: 'Loan Amount',             value: financial_commitments.loan_amount },
              { label: 'Lender',                  value: financial_commitments.lender },
              { label: 'Sanction Limit',          value: financial_commitments.sanction_limit },
              { label: 'Contingent Liabilities',  value: financial_commitments.contingent_liabilities },
              { label: 'Legal Cases',             value: financial_commitments.legal_cases },
              { label: 'Guarantees',              value: financial_commitments.guarantees },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
                <span className="text-gray-800">
                  {value ?? <span className="text-gray-300 italic">Not found</span>}
                </span>
              </div>
            ))}
          </div>

          {financial_commitments.risk_flags.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Risk Keywords Identified
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {financial_commitments.risk_flags.map((flag) => (
                    <Badge
                      key={flag}
                      variant="outline"
                      className="text-xs bg-red-50 text-red-700 border-red-200"
                    >
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
