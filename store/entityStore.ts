'use client';

import { create } from 'zustand';
import { Entity, EntityFormData } from '@/types/entity';

interface EntityStore {
  entities: Entity[];
  currentEntity: Entity | null;
  isLoading: boolean;
  formData: Partial<EntityFormData>;
  currentStep: number;
  setEntities: (entities: Entity[]) => void;
  setCurrentEntity: (entity: Entity | null) => void;
  setLoading: (loading: boolean) => void;
  updateFormData: (data: Partial<EntityFormData>) => void;
  setCurrentStep: (step: number) => void;
  resetForm: () => void;
}

const initialFormData: Partial<EntityFormData> = {
  companyName: '',
  cin: '',
  pan: '',
  registeredAddress: '',
  sector: '',
  subSector: '',
  yearOfIncorporation: '',
  annualTurnover: '',
  netProfit: '',
  totalAssets: '',
  totalDebt: '',
  loanType: '',
  loanAmount: '',
  interestRate: '',
  tenure: '',
  purpose: '',
  assetType: '',
  assetValue: '',
  securityCoverage: '',
};

export const useEntityStore = create<EntityStore>((set) => ({
  entities: [],
  currentEntity: null,
  isLoading: false,
  formData: initialFormData,
  currentStep: 0,
  setEntities: (entities) => set({ entities }),
  setCurrentEntity: (entity) => set({ currentEntity: entity }),
  setLoading: (loading) => set({ isLoading: loading }),
  updateFormData: (data) =>
    set((state) => ({
      formData: { ...state.formData, ...data },
    })),
  setCurrentStep: (step) => set({ currentStep: step }),
  resetForm: () => set({ formData: initialFormData, currentStep: 0 }),
}));
