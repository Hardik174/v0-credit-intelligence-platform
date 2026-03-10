export const SECTORS = [
  'Banking & Financial Services',
  'Information Technology',
  'Manufacturing',
  'Healthcare & Pharmaceuticals',
  'Real Estate & Infrastructure',
  'Energy & Power',
  'Agriculture',
  'FMCG & Retail',
  'Telecom',
  'Automobiles',
  'Chemicals',
  'Textiles',
  'Education',
  'Media & Entertainment',
  'Others',
];

export const LOAN_TYPES = [
  'Term Loan',
  'Working Capital',
  'OD',
  'CC',
] as const;

export const DOCUMENT_TYPES = [
  'ALM Report',
  'Shareholding Pattern',
  'Borrowing Profile',
  'Annual Reports',
  'Portfolio Performance',
] as const;

export const ASSET_TYPES = [
  'Immovable Property',
  'Plant & Machinery',
  'Inventory',
  'Receivables',
  'Fixed Deposits',
  'Gold',
  'Shares & Securities',
  'Other',
];

export const CAM_SECTIONS = [
  { title: 'Executive Summary', slug: 'executive-summary' },
  { title: 'Borrower Profile', slug: 'borrower-profile' },
  { title: 'Industry Analysis', slug: 'industry-analysis' },
  { title: 'Business Model', slug: 'business-model' },
  { title: 'Financial Analysis', slug: 'financial-analysis' },
  { title: 'Borrowing Profile', slug: 'borrowing-profile' },
  { title: 'Shareholding Pattern', slug: 'shareholding-pattern' },
  { title: 'ALM Analysis', slug: 'alm-analysis' },
  { title: 'Portfolio Performance', slug: 'portfolio-performance' },
  { title: 'Risk Assessment', slug: 'risk-assessment' },
  { title: 'SWOT Analysis', slug: 'swot-analysis' },
  { title: 'Collateral & Security', slug: 'collateral-security' },
  { title: 'Credit Rating', slug: 'credit-rating' },
  { title: 'Loan Recommendation', slug: 'loan-recommendation' },
];

export const PROCESSING_STAGES = [
  'Uploaded',
  'Classified',
  'Extracted',
  'Analyzed',
  'CAM Generated',
] as const;
