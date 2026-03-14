'use client';

/**
 * app/onboarding/page.tsx
 *
 * Multi-step entity onboarding workflow:
 *   Step 1 – Company & Loan details form  →  POST /entity-onboard
 *   Step 2 – Document upload              →  POST /upload-documents/{id}
 *   Step 3 – Run analysis                 →  POST /classify-documents + /extract-data
 *            → redirects to /results
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createEntitySession } from '@/lib/ingestor-api';
import { useSessionStore } from '@/store/sessionStore';
import { DocumentUploader } from '@/components/DocumentUploader';
import { SECTORS, LOAN_TYPES } from '@/lib/constants';
import { EntityOnboardPayload } from '@/types/analysis';

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: 'Entity Details', icon: Building2 },
  { id: 2, label: 'Upload Documents', icon: FileSearch },
  { id: 3, label: 'Run Analysis', icon: CreditCard },
] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = current > step.id;
        const active = current === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  done
                    ? 'bg-green-500 border-green-500 text-white'
                    : active
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
                )}
              >
                {done ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-24 mx-2 mt-[-18px] transition-all',
                  done ? 'bg-green-400' : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form field helper
// ---------------------------------------------------------------------------

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 – Entity + loan details form
// ---------------------------------------------------------------------------

interface FormState {
  company_name: string;
  cin: string;
  pan: string;
  sector: string;
  turnover: string;
  loan_type: string;
  loan_amount: string;
  tenure: string;
  interest_rate: string;
}

const INITIAL_FORM: FormState = {
  company_name: '',
  cin: '',
  pan: '',
  sector: '',
  turnover: '',
  loan_type: '',
  loan_amount: '',
  tenure: '',
  interest_rate: '',
};

function validateForm(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.company_name.trim()) e.company_name = 'Company name is required';
  if (!f.cin.trim()) e.cin = 'CIN is required';
  else if (f.cin.length !== 21) e.cin = 'CIN must be exactly 21 characters';
  if (!f.pan.trim()) e.pan = 'PAN is required';
  else if (f.pan.length !== 10) e.pan = 'PAN must be exactly 10 characters';
  if (!f.sector) e.sector = 'Sector is required';
  if (!f.turnover.trim()) e.turnover = 'Annual turnover is required';
  if (!f.loan_type) e.loan_type = 'Loan type is required';
  if (!f.loan_amount.trim()) e.loan_amount = 'Loan amount is required';
  if (!f.tenure.trim()) e.tenure = 'Tenure is required';
  if (!f.interest_rate.trim()) e.interest_rate = 'Interest rate is required';
  return e;
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const { setSessionId, sessionId } = useSessionStore();

  const [step, setStep] = useState<1 | 2 | 3>(sessionId ? 2 : 1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  // Step 1 submit → POST /entity-onboard
  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors = validateForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    const payload: EntityOnboardPayload = {
      company_name: form.company_name,
      cin: form.cin.toUpperCase(),
      pan: form.pan.toUpperCase(),
      sector: form.sector,
      turnover: form.turnover,
      loan_details: {
        loan_type: form.loan_type,
        loan_amount: form.loan_amount,
        tenure: form.tenure,
        interest_rate: form.interest_rate,
      },
    };

    try {
      const res = await createEntitySession(payload);
      setSessionId(res.session_id);
      setStep(2);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  }

  // Called by DocumentUploader when analysis is complete
  function handleAnalysisDone() {
    router.push('/results');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Credit Assessment Onboarding</h1>
        <p className="text-gray-500 mt-1">
          Register the entity, upload financial documents, and run the analysis pipeline.
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 1: Entity + Loan Details ── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Entity & Loan Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleOnboard} className="space-y-6">
              {/* Company details */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Company Information
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Company Name" error={errors.company_name} required>
                    <Input
                      placeholder="Ramesh Steel & Fabrications Pvt Ltd"
                      value={form.company_name}
                      onChange={(e) => setField('company_name', e.target.value)}
                      className={cn(errors.company_name && 'border-red-400')}
                    />
                  </Field>
                  <Field label="CIN" error={errors.cin} required>
                    <Input
                      placeholder="U27100MH2011PTC218847"
                      maxLength={21}
                      value={form.cin}
                      onChange={(e) => setField('cin', e.target.value.toUpperCase())}
                      className={cn(errors.cin && 'border-red-400')}
                    />
                  </Field>
                  <Field label="PAN" error={errors.pan} required>
                    <Input
                      placeholder="AABCR1234F"
                      maxLength={10}
                      value={form.pan}
                      onChange={(e) => setField('pan', e.target.value.toUpperCase())}
                      className={cn(errors.pan && 'border-red-400')}
                    />
                  </Field>
                  <Field label="Sector" error={errors.sector} required>
                    <Select
                      value={form.sector}
                      onValueChange={(v) => setField('sector', v)}
                    >
                      <SelectTrigger className={cn(errors.sector && 'border-red-400')}>
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Annual Turnover" error={errors.turnover} required>
                    <Input
                      placeholder="e.g. INR 48.5 Crore"
                      value={form.turnover}
                      onChange={(e) => setField('turnover', e.target.value)}
                      className={cn(errors.turnover && 'border-red-400')}
                    />
                  </Field>
                </div>
              </div>

              <Separator />

              {/* Loan details */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  Loan Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Loan Type" error={errors.loan_type} required>
                    <Select
                      value={form.loan_type}
                      onValueChange={(v) => setField('loan_type', v)}
                    >
                      <SelectTrigger className={cn(errors.loan_type && 'border-red-400')}>
                        <SelectValue placeholder="Select loan type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOAN_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Loan Amount" error={errors.loan_amount} required>
                    <Input
                      placeholder="e.g. INR 8 Crore"
                      value={form.loan_amount}
                      onChange={(e) => setField('loan_amount', e.target.value)}
                      className={cn(errors.loan_amount && 'border-red-400')}
                    />
                  </Field>
                  <Field label="Tenure" error={errors.tenure} required>
                    <Input
                      placeholder="e.g. 5 years"
                      value={form.tenure}
                      onChange={(e) => setField('tenure', e.target.value)}
                      className={cn(errors.tenure && 'border-red-400')}
                    />
                  </Field>
                  <Field label="Interest Rate" error={errors.interest_rate} required>
                    <Input
                      placeholder="e.g. 11.25% p.a."
                      value={form.interest_rate}
                      onChange={(e) => setField('interest_rate', e.target.value)}
                      className={cn(errors.interest_rate && 'border-red-400')}
                    />
                  </Field>
                </div>
              </div>

              {/* API error */}
              {apiError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{apiError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating session…
                  </>
                ) : (
                  <>
                    Continue to Document Upload
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2 & 3: Document upload + analysis ── */}
      {step >= 2 && sessionId && (
        <>
          {/* Session badge */}
          <div className="flex items-center gap-2 px-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-600">Session created:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {sessionId}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400 h-6"
              onClick={() => {
                setStep(1);
                setForm(INITIAL_FORM);
              }}
            >
              Start over
            </Button>
          </div>

          {/* Document uploader handles steps 2 → 3 internally */}
          <DocumentUploader sessionId={sessionId} onAnalysisComplete={handleAnalysisDone} />
        </>
      )}
    </div>
  );
}
