export interface Entity {
  id: string;
  companyName: string;
  cin: string;
  pan: string;
  registeredAddress: string;
  sector: string;
  subSector: string;
  yearOfIncorporation: number;
  financialSnapshot: FinancialSnapshot;
  loanDetails: LoanDetails;
  collateral: CollateralInfo;
  status: EntityStatus;
  riskScore: number | null;
  lastUpdated: string;
  createdAt: string;
}

export interface FinancialSnapshot {
  annualTurnover: number;
  netProfit: number;
  totalAssets: number;
  totalDebt: number;
}

export interface LoanDetails {
  loanType: 'Term Loan' | 'Working Capital' | 'OD' | 'CC';
  loanAmount: number;
  interestRate: number;
  tenure: number;
  purpose: string;
}

export interface CollateralInfo {
  assetType: string;
  assetValue: number;
  securityCoverage: number;
}

export type EntityStatus =
  | 'Draft'
  | 'Documents Pending'
  | 'Under Extraction'
  | 'Under Analysis'
  | 'CAM Generated'
  | 'Approved'
  | 'Rejected';

export interface EntityFormData {
  companyName: string;
  cin: string;
  pan: string;
  registeredAddress: string;
  sector: string;
  subSector: string;
  yearOfIncorporation: string;
  annualTurnover: string;
  netProfit: string;
  totalAssets: string;
  totalDebt: string;
  loanType: string;
  loanAmount: string;
  interestRate: string;
  tenure: string;
  purpose: string;
  assetType: string;
  assetValue: string;
  securityCoverage: string;
}
