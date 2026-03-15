'use client';

import { useState, useEffect } from 'react';
import { CAMReport, CAMSection } from '@/types/cam';
import { CAM_SECTIONS } from '@/lib/constants';
import { getCAMReport } from '@/lib/ingestor-api';
import { api } from '@/lib/api';
import type { CAMReportResponse, GSTAnalysis, BankAnalysis } from '@/types/analysis';

// ---------------------------------------------------------------------------
// Number formatter (Indian lakh / crore)
// ---------------------------------------------------------------------------

function fmt(n: number | undefined | null): string {
  if (n == null) return 'N/A';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Map CAMReportResponse from backend → 14 CAMSection objects
// ---------------------------------------------------------------------------

function buildSections(report: CAMReportResponse): CAMSection[] {
  const {
    entity_profile: ep,
    loan_details: ld,
    financial_summary: fs,
    fraud_signals,
    research_insights: ri,
    risk_score,
    risk_level,
    swot_analysis: swot,
    recommendation,
  } = report;

  const gst: GSTAnalysis = fs.gst_analysis;
  const bank: BankAnalysis = fs.bank_analysis;
  const fc = fs.financial_commitments;
  const riskSignals = (ri as Record<string, unknown>)?.risk_signals as Record<string, unknown> ?? {};

  const contentMap: Record<string, string> = {
    'executive-summary':
      `## Executive Summary\n\n` +
      `**${ep.company_name}** has applied for **${ld.loan_type}** credit facility of **${ld.loan_amount}**.\n\n` +
      `### Risk Summary\n` +
      `- **Risk Score:** ${risk_score}/100\n` +
      `- **Risk Level:** ${risk_level}\n` +
      `- **Fraud Signals:** ${fraud_signals.length > 0 ? fraud_signals.map(f => f.flag).join(', ') : 'None detected'}\n\n` +
      `### Recommendation\n\n${recommendation}\n\n` +
      `### Key Financial Highlights\n` +
      `- GST Revenue: ${fmt(gst.total_invoice_value)}\n` +
      `- Bank Credit Inflow: ${fmt(bank.total_credit_inflow)}\n` +
      `- Invoice Count: ${gst.invoice_count}\n` +
      `- Net Cash Flow: ${fmt(bank.net_flow)}`,

    'borrower-profile':
      `## Borrower Profile\n\n` +
      `| Field | Details |\n|---|---|\n` +
      `| Company Name | ${ep.company_name} |\n` +
      `| CIN | ${ep.cin || 'N/A'} |\n` +
      `| PAN | ${ep.pan || 'N/A'} |\n` +
      `| Sector | ${ep.sector || 'N/A'} |\n` +
      `| Annual Turnover | ${ep.turnover || 'N/A'} |\n\n` +
      `### Loan Facility Requested\n\n` +
      `| Parameter | Value |\n|---|---|\n` +
      `| Loan Type | ${ld.loan_type} |\n` +
      `| Loan Amount | ${ld.loan_amount} |\n` +
      `| Tenure | ${ld.tenure} |\n` +
      `| Interest Rate | ${ld.interest_rate} |`,

    'industry-analysis':
      `## Industry Analysis\n\n` +
      `**Sector:** ${ep.sector || 'N/A'}\n\n` +
      `### AI Research Insight\n\n` +
      (((ri as Record<string, unknown>)?.ai_insight_summary as string) || 'Research data not available for this session.') +
      `\n\n### Risk Signals\n` +
      `- Litigation Cases: ${(riskSignals.litigation_cases as number) ?? 0}\n` +
      `- Negative News: ${(riskSignals.negative_news as number) ?? 0}\n` +
      `- Sector Risk: ${(riskSignals.sector_risk as string) ?? 'N/A'}`,

    'business-model':
      `## Business Model\n\n` +
      `${ep.company_name} operates in the **${ep.sector || 'N/A'}** sector ` +
      `with an annual declared turnover of **${ep.turnover || 'N/A'}**.\n\n` +
      `GST data shows **${gst.invoice_count} invoices** issued to **${gst.unique_buyers} unique buyers**, ` +
      `indicating an active supply-chain and customer base.\n\n` +
      (gst.top_buyers && gst.top_buyers.length > 0
        ? `### Top Buyers\n` +
          gst.top_buyers.slice(0, 5).map(b => `- GSTIN: ${b.gstin} — ${fmt(b.total_value)}`).join('\n')
        : ''),

    'financial-analysis':
      `## Financial Analysis\n\n` +
      `### GST Analysis\n\n` +
      `| Metric | Value |\n|---|---|\n` +
      `| Total Invoice Value | ${fmt(gst.total_invoice_value)} |\n` +
      `| Invoice Count | ${gst.invoice_count} |\n` +
      `| Unique Buyers | ${gst.unique_buyers} |\n` +
      (gst.unique_sellers != null ? `| Unique Sellers | ${gst.unique_sellers} |\n` : '') +
      `\n### Bank Statement Analysis\n\n` +
      `| Metric | Value |\n|---|---|\n` +
      `| Total Credit Inflow | ${fmt(bank.total_credit_inflow)} |\n` +
      `| Total Debit Outflow | ${fmt(bank.total_debit_outflow)} |\n` +
      `| Net Cash Flow | ${fmt(bank.net_flow)} |\n` +
      `| Total Transactions | ${bank.transaction_count} |\n\n` +
      (fraud_signals.length > 0
        ? `### Fraud Signals Detected\n\n` +
          fraud_signals.map(f => `- **${f.flag}**: ${f.description}`).join('\n')
        : `### No Fraud Signals Detected`),

    'borrowing-profile':
      `## Borrowing Profile\n\n` +
      `### Facility Requested\n\n` +
      `| Parameter | Value |\n|---|---|\n` +
      `| Loan Type | ${ld.loan_type} |\n` +
      `| Requested Amount | ${ld.loan_amount} |\n` +
      `| Tenure | ${ld.tenure} |\n` +
      `| Interest Rate | ${ld.interest_rate} |\n\n` +
      `### Existing Liabilities (from documents)\n\n` +
      `| Item | Details |\n|---|---|\n` +
      `| Lender | ${fc.lender || 'Not identified'} |\n` +
      `| Sanction Limit | ${fc.sanction_limit || 'Not identified'} |\n` +
      `| Contingent Liabilities | ${fc.contingent_liabilities || 'Not disclosed'} |\n` +
      `| Legal Cases | ${fc.legal_cases || 'None identified'} |\n` +
      `| Guarantees | ${fc.guarantees || 'None identified'} |`,

    'shareholding-pattern':
      `## Shareholding Pattern\n\n` +
      `Shareholding data not available from current document set.\n\n` +
      `To include shareholding analysis, upload the company's Shareholding Pattern document ` +
      `(Annual Report or BSE/NSE filing) in the onboarding stage.`,

    'alm-analysis':
      `## Asset-Liability Management (ALM)\n\n` +
      `### Cash Flow Summary\n\n` +
      `| Metric | Value |\n|---|---|\n` +
      `| Credit Inflow | ${fmt(bank.total_credit_inflow)} |\n` +
      `| Debit Outflow | ${fmt(bank.total_debit_outflow)} |\n` +
      `| Net Position | ${fmt(bank.net_flow)} |\n` +
      `| Transaction Count | ${bank.transaction_count} |\n\n` +
      `### Assessment\n\n` +
      (bank.net_flow >= 0
        ? `- Positive net cash position indicates adequate short-term liquidity.`
        : `- Negative net cash position warrants scrutiny of repayment capacity.`),

    'portfolio-performance':
      `## Portfolio Performance\n\n` +
      `### GST Invoice Distribution\n\n` +
      `- Total GST Revenue: ${fmt(gst.total_invoice_value)}\n` +
      `- Total Invoices: ${gst.invoice_count}\n` +
      `- Unique Counterparties: ${gst.unique_buyers}\n\n` +
      (gst.top_buyers && gst.top_buyers.length > 0
        ? `### Top Buyers by Invoice Value\n\n` +
          `| GSTIN | Invoice Value |\n|---|---|\n` +
          gst.top_buyers.slice(0, 5).map(b => `| ${b.gstin} | ${fmt(b.total_value)} |`).join('\n')
        : `Top buyer data not available.`),

    'risk-assessment':
      `## Risk Assessment\n\n` +
      `### Overall Risk Score: ${risk_score}/100 (${risk_level})\n\n` +
      (fraud_signals.length > 0
        ? `### Fraud Signals\n\n` +
          fraud_signals.map(f =>
            `#### ${f.flag}\n${f.description}` +
            ('ratio' in f && (f as Record<string, unknown>).ratio != null
              ? `\n- Ratio: ${(f as Record<string, unknown>).ratio}x`
              : '') +
            ('cycle_count' in f
              ? `\n- Cycles Detected: ${(f as Record<string, unknown>).cycle_count}`
              : '')
          ).join('\n\n')
        : `### No Fraud Signals\n\nNo revenue inflation, circular trading, or dense subgraph patterns found.`) +
      `\n\n### Document Risk Keywords\n\n` +
      (fc.risk_flags.length > 0
        ? fc.risk_flags.map(f => `- ${f}`).join('\n')
        : `- No high-severity risk keywords identified in documents.`),

    'swot-analysis':
      `## SWOT Analysis\n\n` +
      `### Strengths\n\n` + swot.strengths.map(s => `- ${s}`).join('\n') +
      `\n\n### Weaknesses\n\n` + swot.weaknesses.map(s => `- ${s}`).join('\n') +
      `\n\n### Opportunities\n\n` + swot.opportunities.map(s => `- ${s}`).join('\n') +
      `\n\n### Threats\n\n` + swot.threats.map(s => `- ${s}`).join('\n'),

    'collateral-security':
      `## Collateral & Security\n\n` +
      `| Type | Details |\n|---|---|\n` +
      `| Primary Security | To be specified per sanction terms |\n` +
      `| Guarantees | ${fc.guarantees || 'Not identified in documents'} |\n` +
      `| Contingent Liabilities | ${fc.contingent_liabilities || 'Not disclosed'} |\n\n` +
      `Detailed collateral schedule to be provided at sanction stage.`,

    'credit-rating':
      `## Credit Rating\n\n` +
      `| Parameter | Value |\n|---|---|\n` +
      `| Internal Risk Score | ${risk_score}/100 |\n` +
      `| Risk Level | ${risk_level} |\n` +
      `| Fraud Signals | ${fraud_signals.length} detected |\n` +
      `| Research Sector Risk | ${(riskSignals.sector_risk as string) ?? 'N/A'} |\n\n` +
      `### Scale\n\n` +
      `- Score ≤ 30 → **Low Risk** (Approve)\n` +
      `- Score 31–60 → **Moderate Risk** (Conditional Approval)\n` +
      `- Score > 60 → **High Risk** (Reject / Refer)\n\n` +
      `**Current:** ${risk_score}/100 → **${risk_level}**`,

    'loan-recommendation':
      `## Loan Recommendation\n\n` +
      `### Final Decision\n\n${recommendation}\n\n` +
      `### Facility Summary\n\n` +
      `| Parameter | Value |\n|---|---|\n` +
      `| Borrower | ${ep.company_name} |\n` +
      `| Facility Type | ${ld.loan_type} |\n` +
      `| Requested Amount | ${ld.loan_amount} |\n` +
      `| Tenure | ${ld.tenure} |\n` +
      `| Interest Rate | ${ld.interest_rate} |\n` +
      `| Risk Score | ${risk_score}/100 (${risk_level}) |`,
  };

  return (CAM_SECTIONS as Array<{ title: string; slug: string }>).map((s, i) => ({
    id: `sec-${i}`,
    title: s.title,
    slug: s.slug,
    content:
      contentMap[s.slug] ??
      `## ${s.title}\n\nData not available from current analysis.`,
    isEdited: false,
    order: i,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useCAM – fetches a Credit Assessment Memorandum.
 *
 * Priority order:
 *   1. sessionId provided → GET /generate-cam-report/{sessionId}  (full pipeline CAM)
 *   2. companyName provided → GET /api/cam-report/{company}       (standalone CAM)
 *   3. Neither → loading=false, cam=null (shows prompt state)
 *
 * When the session-based fetch fails it automatically retries with the
 * company-based endpoint so the page never stays blank.
 */
export function useCAM(sessionId?: string, companyName?: string) {
  const [cam, setCAM] = useState<CAMReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const applyReport = (report: CAMReportResponse) => {
      if (cancelled) return;
      const sections = buildSections(report);
      setCAM({
        id: report.session_id,
        entityId: report.entity_profile.company_name,
        status: 'completed',
        sections,
        generatedAt: report.generated_at,
        lastModified: report.generated_at,
      });
    };

    const fetchCAM = async () => {
      setIsLoading(true);
      setError(null);

      // Nothing to fetch
      if (!sessionId && !companyName) {
        setCAM(null);
        setIsLoading(false);
        return;
      }

      // ── Path 1: Session-based CAM ─────────────────────────────────────
      if (sessionId) {
        try {
          const report = await getCAMReport(sessionId);
          applyReport(report);
          return;
        } catch (sessionErr) {
          const msg = sessionErr instanceof Error ? sessionErr.message : String(sessionErr);
          console.error('[useCAM] Session-based fetch failed:', msg);

          // Fall through to company fallback if we have a company name
          if (!companyName) {
            if (!cancelled) {
              setError(msg);
              setCAM(null);
            }
            return;
          }
          console.info('[useCAM] Retrying with company fallback:', companyName);
        }
      }

      // ── Path 2: Standalone company CAM ───────────────────────────────
      try {
        const report = (await api.getCAMReport(companyName!)) as CAMReportResponse;
        applyReport(report);
      } catch (companyErr) {
        if (cancelled) return;
        const msg = companyErr instanceof Error ? companyErr.message : 'Failed to load CAM report.';
        console.error('[useCAM] Company-based fetch also failed:', msg);
        setError(msg);
        setCAM(null);
      }
    };

    fetchCAM().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [sessionId, companyName]);

  const updateSection = (sectionId: string, content: string) => {
    if (!cam) return;
    setCAM({
      ...cam,
      sections: cam.sections.map((s) =>
        s.id === sectionId ? { ...s, content, isEdited: true } : s
      ),
      lastModified: new Date().toISOString(),
    });
  };

  return { cam, isLoading, error, updateSection };
}
