import { useState, useEffect } from 'react';
import { CAMReport } from '@/types/cam';
import { CAM_SECTIONS } from '@/lib/constants';

const generateMockCAM = (): CAMReport => ({
  id: 'cam1',
  entityId: '1',
  status: 'in_progress',
  generatedAt: '2024-01-15T10:00:00Z',
  lastModified: '2024-01-15T12:00:00Z',
  sections: CAM_SECTIONS.map((s, i) => ({
    id: `sec-${i}`,
    title: s.title,
    slug: s.slug,
    content: getDefaultContent(s.slug),
    isEdited: false,
    order: i,
  })),
});

function getDefaultContent(slug: string): string {
  const contents: Record<string, string> = {
    'executive-summary':
      '## Executive Summary\n\nTata Steel Limited, one of India\'s largest integrated steel producers, has applied for a Term Loan facility of ₹50,000 Crores for the capacity expansion of their Kalinganagar plant in Odisha. The company, incorporated in 1907, has demonstrated consistent financial performance with an annual turnover of ₹2,48,000 Crores and net profit of ₹33,000 Crores.\n\nThe proposed loan is backed by immovable property valued at ₹75,000 Crores, providing a security coverage of 1.5x. The company\'s DSCR of 1.45x is above the minimum threshold of 1.25x, indicating adequate debt servicing capacity.\n\n**Recommendation:** The credit committee may consider approving the loan facility with standard monitoring covenants and quarterly review mechanism.',
    'borrower-profile':
      '## Borrower Profile\n\n**Company Name:** Tata Steel Limited\n**CIN:** L27100MH1907PLC000260\n**Registered Address:** Bombay House, 24 Homi Mody Street, Mumbai 400001\n**Year of Incorporation:** 1907\n**Sector:** Manufacturing - Steel\n\n### Management Team\n- **Chairman:** N. Chandrasekaran\n- **CEO & MD:** T.V. Narendran\n- **CFO:** Koushik Chatterjee\n\n### Group Structure\nTata Steel is a subsidiary of Tata Sons Private Limited and is part of the Tata Group, one of India\'s most diversified conglomerates. The company operates in 26 countries with a combined employee strength of over 80,000.',
    'industry-analysis':
      '## Industry Analysis\n\n### Indian Steel Sector Overview\nIndia is the world\'s second-largest steel producer with a production capacity of approximately 155 MTPA. The sector has benefited from the government\'s National Steel Policy targeting 300 MTPA capacity by 2030.\n\n### Key Trends\n1. **Infrastructure Push:** Government\'s Gati Shakti initiative driving domestic demand\n2. **Chinese Competition:** Increasing steel imports from China at dumped prices\n3. **Green Steel:** Growing focus on carbon-neutral steel production\n4. **Capacity Expansion:** Multiple players announcing greenfield expansions\n\n### Outlook\nThe sector outlook is moderately positive with domestic demand expected to grow at 7-8% annually, supported by infrastructure and construction activity.',
    'business-model': '## Business Model\n\nContent pending generation by AI.',
    'financial-analysis':
      '## Financial Analysis\n\n### Key Financial Metrics (FY 2023-24)\n\n| Metric | Amount (₹ Cr) | YoY Change |\n|--------|---------------|------------|\n| Revenue | 2,48,000 | +8.5% |\n| EBITDA | 52,000 | +15.2% |\n| Net Profit | 33,000 | +12.1% |\n| Total Assets | 3,10,000 | +6.8% |\n| Total Debt | 87,000 | -3.2% |\n\n### Key Ratios\n- **Debt-to-Equity:** 0.68\n- **DSCR:** 1.45x\n- **Interest Coverage:** 5.8x\n- **EBITDA Margin:** 21%\n- **ROE:** 18.5%\n- **Current Ratio:** 1.12',
    'borrowing-profile': '## Borrowing Profile\n\nContent pending generation by AI.',
    'shareholding-pattern': '## Shareholding Pattern\n\nContent pending generation by AI.',
    'alm-analysis': '## ALM Analysis\n\nContent pending generation by AI.',
    'portfolio-performance': '## Portfolio Performance\n\nContent pending generation by AI.',
    'risk-assessment':
      '## Risk Assessment\n\n### Overall Risk Score: 72/100 (Moderate)\n\n### Financial Risk (Score: 65)\n- Elevated debt levels relative to sector\n- Cyclical revenue patterns\n- Strong cash flow generation provides buffer\n\n### Operational Risk (Score: 78)\n- World-class facilities with high capacity utilization\n- Captive raw material sources\n- Expansion project on schedule\n\n### Market Risk (Score: 58)\n- Chinese dumping threat\n- Global price volatility\n- Strong domestic demand outlook\n\n### Governance Risk (Score: 88)\n- Strong Tata Group governance framework\n- Independent board composition\n- Clean audit history',
    'swot-analysis':
      '## SWOT Analysis\n\n### Strengths\n- Leading market position in Indian steel sector\n- Diversified product portfolio\n- Captive iron ore and coal mines\n- Strong brand and Tata Group backing\n- Experienced management team\n\n### Weaknesses\n- Higher debt compared to peers\n- Exposure to cyclical steel prices\n- European operations under pressure\n\n### Opportunities\n- Government infrastructure push\n- Growing automotive and construction sectors\n- Green steel premium\n- Consolidation opportunities\n\n### Threats\n- Chinese steel dumping\n- Raw material price volatility\n- Environmental regulations\n- Currency fluctuation risk',
    'collateral-security': '## Collateral & Security\n\nContent pending generation by AI.',
    'credit-rating': '## Credit Rating\n\nContent pending generation by AI.',
    'loan-recommendation':
      '## Loan Recommendation\n\n### Facility Details\n- **Type:** Term Loan\n- **Amount:** ₹50,000 Crores\n- **Rate:** 8.5% p.a.\n- **Tenure:** 7 years\n- **Purpose:** Kalinganagar plant expansion\n\n### Security\n- Primary: Immovable property (₹75,000 Cr)\n- Security Coverage: 1.5x\n\n### Recommendation\nBased on the comprehensive analysis of the borrower\'s financial position, industry outlook, and risk assessment, it is recommended that the credit facility be **APPROVED** with the following conditions:\n\n1. Quarterly financial reporting\n2. Minimum DSCR covenant of 1.25x\n3. Maximum D/E ratio covenant of 1.0x\n4. Utilization monitoring on monthly basis\n5. Insurance coverage on collateral assets',
  };

  return contents[slug] || `## ${slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}\n\nContent will be generated by AI based on extracted data and analysis.`;
}

export function useCAM(entityId?: string) {
  const [cam, setCAM] = useState<CAMReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCAM = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCAM(generateMockCAM());
      setIsLoading(false);
    };
    fetchCAM();
  }, [entityId]);

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

  return { cam, isLoading, updateSection };
}
