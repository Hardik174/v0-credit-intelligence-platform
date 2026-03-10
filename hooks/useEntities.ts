import { useState, useEffect, useCallback } from 'react';
import { Entity } from '@/types/entity';
import { useEntityStore } from '@/store/entityStore';

const mockEntities: Entity[] = [
  {
    id: '1',
    companyName: 'Tata Steel Limited',
    cin: 'L27100MH1907PLC000260',
    pan: 'AAACT2727Q',
    registeredAddress: 'Bombay House, 24 Homi Mody Street, Mumbai 400001',
    sector: 'Manufacturing',
    subSector: 'Steel',
    yearOfIncorporation: 1907,
    financialSnapshot: {
      annualTurnover: 248000000000,
      netProfit: 33000000000,
      totalAssets: 310000000000,
      totalDebt: 87000000000,
    },
    loanDetails: {
      loanType: 'Term Loan',
      loanAmount: 50000000000,
      interestRate: 8.5,
      tenure: 7,
      purpose: 'Capacity expansion of Kalinganagar plant',
    },
    collateral: {
      assetType: 'Immovable Property',
      assetValue: 75000000000,
      securityCoverage: 1.5,
    },
    status: 'Under Analysis',
    riskScore: 72,
    lastUpdated: '2024-01-15T10:30:00Z',
    createdAt: '2024-01-10T09:00:00Z',
  },
  {
    id: '2',
    companyName: 'Infosys Limited',
    cin: 'L85110KA1981PLC013115',
    pan: 'AAACI1195H',
    registeredAddress: 'Electronics City, Hosur Road, Bangalore 560100',
    sector: 'Information Technology',
    subSector: 'IT Services',
    yearOfIncorporation: 1981,
    financialSnapshot: {
      annualTurnover: 1462000000000,
      netProfit: 240000000000,
      totalAssets: 950000000000,
      totalDebt: 12000000000,
    },
    loanDetails: {
      loanType: 'Working Capital',
      loanAmount: 20000000000,
      interestRate: 7.8,
      tenure: 3,
      purpose: 'Working capital requirements for new digital transformation projects',
    },
    collateral: {
      assetType: 'Fixed Deposits',
      assetValue: 30000000000,
      securityCoverage: 1.5,
    },
    status: 'CAM Generated',
    riskScore: 89,
    lastUpdated: '2024-01-14T14:20:00Z',
    createdAt: '2024-01-08T11:30:00Z',
  },
  {
    id: '3',
    companyName: 'Adani Green Energy',
    cin: 'L40106GJ2015PLC082007',
    pan: 'AAGCA8118K',
    registeredAddress: 'Adani House, Near Mithakhali Circle, Ahmedabad 380009',
    sector: 'Energy & Power',
    subSector: 'Renewable Energy',
    yearOfIncorporation: 2015,
    financialSnapshot: {
      annualTurnover: 78000000000,
      netProfit: 5000000000,
      totalAssets: 600000000000,
      totalDebt: 420000000000,
    },
    loanDetails: {
      loanType: 'Term Loan',
      loanAmount: 100000000000,
      interestRate: 9.2,
      tenure: 15,
      purpose: 'Solar park development in Rajasthan',
    },
    collateral: {
      assetType: 'Plant & Machinery',
      assetValue: 150000000000,
      securityCoverage: 1.5,
    },
    status: 'Documents Pending',
    riskScore: 45,
    lastUpdated: '2024-01-13T08:45:00Z',
    createdAt: '2024-01-12T16:00:00Z',
  },
];

export function useEntities() {
  const { entities, setEntities, isLoading, setLoading } = useEntityStore();
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setEntities(mockEntities);
    } catch (err) {
      setError('Failed to fetch entities');
    } finally {
      setLoading(false);
    }
  }, [setEntities, setLoading]);

  useEffect(() => {
    if (entities.length === 0) {
      fetchEntities();
    }
  }, []);

  return { entities, isLoading, error, refetch: fetchEntities };
}

export function useEntity(id: string) {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntity = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      const found = mockEntities.find((e) => e.id === id) || null;
      setEntity(found);
      setIsLoading(false);
    };
    fetchEntity();
  }, [id]);

  return { entity, isLoading };
}
