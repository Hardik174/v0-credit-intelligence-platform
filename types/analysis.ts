/**
 * types/analysis.ts
 *
 * TypeScript interfaces that mirror the JSON schema returned by the
 * FastAPI IntelliCredit backend. All field names are snake_case to
 * match the Python response directly – no mapping layer needed.
 *
 * DO NOT merge these with types/entity.ts – the backend schema uses
 * string values for amounts/rates while the UI entity model uses numbers.
 */

// ---------------------------------------------------------------------------
// Entity onboarding – request payload
// ---------------------------------------------------------------------------

export interface ApiLoanDetails {
  loan_type: string;
  loan_amount: string;
  tenure: string;
  interest_rate: string;
}

export interface EntityOnboardPayload {
  company_name: string;
  cin: string;
  pan: string;
  sector: string;
  turnover: string;
  loan_details: ApiLoanDetails;
}

// ---------------------------------------------------------------------------
// Entity onboarding – response
// ---------------------------------------------------------------------------

export interface ApiEntityProfile {
  company_name: string;
  cin: string;
  pan: string;
  sector: string;
  turnover: string;
}

export interface OnboardSessionResponse {
  session_id: string;
  status: string;
  entity_profile: ApiEntityProfile;
  loan_details: ApiLoanDetails;
  next_step: string;
}

// ---------------------------------------------------------------------------
// Document upload – response
// ---------------------------------------------------------------------------

export interface UploadedFileInfo {
  filename: string;
  size_bytes: number;
}

export interface UploadDocumentsResponse {
  session_id: string;
  status: string;
  uploaded: UploadedFileInfo[];
  rejected: Array<{ filename: string; reason: string }>;
  total_files_in_session: number;
  next_step: string;
}

// ---------------------------------------------------------------------------
// Classification – response
// ---------------------------------------------------------------------------

export interface ClassifyDocumentsResponse {
  session_id: string;
  status: string;
  classification: Record<string, string>; // filename → doc type
  classification_mode: string;
  next_step: string;
}

// ---------------------------------------------------------------------------
// Financial analysis – core extracted data
// ---------------------------------------------------------------------------

export interface FinancialCommitments {
  loan_amount: string | null;
  lender: string | null;
  sanction_limit: string | null;
  contingent_liabilities: string | null;
  legal_cases: string | null;
  guarantees: string | null;
  risk_flags: string[];
}

export interface TopBuyer {
  gstin: string;
  total_value: number;
}

export interface GSTAnalysis {
  total_invoice_value: number;
  invoice_count: number;
  unique_buyers: number;
  unique_sellers?: number;
  top_buyers?: TopBuyer[];
}

export interface BankAnalysis {
  total_credit_inflow: number;
  total_debit_outflow: number;
  net_flow: number;
  transaction_count: number;
}

export type RiskLevel = 'Low' | 'Moderate' | 'High';

export interface FraudFlag {
  flag: string;
  description: string;
  // Revenue inflation fields
  gst_revenue?: number;
  bank_inflow?: number;
  ratio?: number | null;
  // Circular trading fields
  cycle_count?: number;
  sample_cycles?: string[][];
  // Dense subgraph fields
  groups?: Array<{ nodes: string[]; density: number; edges: number }>;
}

export interface FinancialAnalysis {
  financial_commitments: FinancialCommitments;
  gst_analysis: GSTAnalysis;
  bank_analysis: BankAnalysis;
  fraud_flags: FraudFlag[];
  risk_score: number;
  risk_level: RiskLevel;
}

// ---------------------------------------------------------------------------
// Full analysis response – returned by /extract-data and /financial-analysis
// ---------------------------------------------------------------------------

export interface FullAnalysisResponse {
  entity_profile: ApiEntityProfile;
  loan_details: ApiLoanDetails;
  financial_analysis: FinancialAnalysis;
}
