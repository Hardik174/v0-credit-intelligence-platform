'use client';

/**
 * components/DocumentUploader.tsx
 *
 * Handles Stage 2 (upload) and Stage 3 (classify + extract + navigate) of the
 * IntelliCredit pipeline.  Rendered inside app/onboarding/page.tsx.
 *
 * Props:
 *   sessionId          – active pipeline session (from sessionStore)
 *   onAnalysisComplete – called when extraction succeeds; parent navigates to /results
 */

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  uploadDocuments,
  classifyDocuments,
  extractData,
} from '@/lib/ingestor-api';
import { useSessionStore } from '@/store/sessionStore';
import type { ClassifyDocumentsResponse } from '@/types/analysis';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DocumentUploaderProps {
  sessionId: string;
  onAnalysisComplete?: () => void;
}

// ---------------------------------------------------------------------------
// File item state tracked locally
// ---------------------------------------------------------------------------

interface FileItem {
  file: File;
  id: string;
  docType?: string; // filled after classification
}

type PipelineStage = 'idle' | 'uploading' | 'classifying' | 'extracting' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Accepted document type hint labels
// ---------------------------------------------------------------------------

const ACCEPTED_TYPES = [
  'Annual Report',
  'GST Returns',
  'Bank Statement',
  'Sanction Letter',
  'Shareholding Pattern',
  'ALM',
  'Borrowing Profile',
  'Portfolio Data',
  'Legal Notice',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />;
  if (ext === 'csv' || ext === 'xlsx' || ext === 'xls')
    return <FileSpreadsheet className="w-4 h-4 text-green-600 flex-shrink-0" />;
  return <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function stageLabel(s: PipelineStage): string {
  switch (s) {
    case 'uploading':   return 'Uploading documents…';
    case 'classifying': return 'Classifying documents…';
    case 'extracting':  return 'Running extraction pipeline…';
    case 'done':        return 'Analysis complete!';
    case 'error':       return 'An error occurred.';
    default:            return '';
  }
}

function stageProgress(s: PipelineStage): number {
  switch (s) {
    case 'uploading':   return 25;
    case 'classifying': return 55;
    case 'extracting':  return 80;
    case 'done':        return 100;
    default:            return 0;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentUploader({ sessionId, onAnalysisComplete }: DocumentUploaderProps) {
  const { setAnalysisResult, setLoading, setError } = useSessionStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [apiError, setApiError] = useState<string | null>(null);
  const [classification, setClassification] = useState<Record<string, string>>({});
  const [uploadedCount, setUploadedCount] = useState(0);
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([]);

  // ------------------------------------------------------------------
  // File selection
  // ------------------------------------------------------------------

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const newItems: FileItem[] = Array.from(incoming).map((file) => ({
      file,
      id: `${file.name}-${file.size}-${Math.random()}`,
    }));
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      return [...prev, ...newItems.filter((f) => !existingNames.has(f.file.name))];
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  // ------------------------------------------------------------------
  // Drag & drop
  // ------------------------------------------------------------------

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // ------------------------------------------------------------------
  // Run analysis pipeline (stages 2 + 3 + 4)
  // ------------------------------------------------------------------

  async function runAnalysis() {
    if (files.length === 0) return;

    setApiError(null);
    setLoading(true);

    try {
      // Stage 2 – Upload
      setStage('uploading');
      const uploadRes = await uploadDocuments(
        sessionId,
        files.map((f) => f.file)
      );
      setUploadedCount(uploadRes.uploaded.length);
      if (uploadRes.rejected.length > 0) {
        setRejectedFiles(uploadRes.rejected.map((r) => r.filename));
      }

      // Stage 3 – Classify
      setStage('classifying');
      const classRes: ClassifyDocumentsResponse = await classifyDocuments(sessionId);
      setClassification(classRes.classification);

      // Update file items with detected doc type
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          docType: classRes.classification[f.file.name] ?? 'Unknown',
        }))
      );

      // Stage 4 – Extract
      setStage('extracting');
      const extractRes = await extractData(sessionId);
      setAnalysisResult({
        entity_profile: extractRes.entity_profile,
        loan_details: extractRes.loan_details,
        financial_analysis: extractRes.financial_analysis,
      });

      setStage('done');
      setError(null);
      onAnalysisComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setStage('error');
      setApiError(msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const running = stage === 'uploading' || stage === 'classifying' || stage === 'extracting';

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-blue-600" />
          Upload Financial Documents
        </CardTitle>
        <p className="text-sm text-gray-500">
          Upload one or more files. The system will auto-classify and analyse them.
        </p>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Accepted document type chips */}
        <div className="flex flex-wrap gap-1.5">
          {ACCEPTED_TYPES.map((t) => (
            <Badge key={t} variant="outline" className="text-xs text-gray-600">
              {t}
            </Badge>
          ))}
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          )}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          aria-label="Upload documents"
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Drag & drop files here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, CSV, XLSX accepted</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100"
              >
                {fileIcon(f.file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{f.file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(f.file.size)}</p>
                </div>
                {f.docType && (
                  <Badge
                    className={cn(
                      'text-xs',
                      f.docType === 'Unknown'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    )}
                    variant="outline"
                  >
                    {f.docType}
                  </Badge>
                )}
                {!running && (
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Rejected files warning */}
        {rejectedFiles.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {rejectedFiles.length} file(s) were rejected (unsupported format):{' '}
              <span className="font-mono text-xs">{rejectedFiles.join(', ')}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Pipeline progress */}
        {stage !== 'idle' && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">{stageLabel(stage)}</span>
              {stage === 'done' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {running && (
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              )}
            </div>
            <Progress value={stageProgress(stage)} className="h-2" />
          </div>
        )}

        {/* API error */}
        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Upload count summary */}
        {uploadedCount > 0 && (
          <p className="text-xs text-gray-500">
            {uploadedCount} document{uploadedCount !== 1 ? 's' : ''} uploaded to session.
          </p>
        )}

        {/* Run Analysis button */}
        <Button
          className="w-full"
          disabled={files.length === 0 || running || stage === 'done'}
          onClick={runAnalysis}
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {stageLabel(stage)}
            </>
          ) : stage === 'done' ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Analysis Complete — Redirecting…
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Analysis
            </>
          )}
        </Button>

        {files.length === 0 && (
          <p className="text-xs text-center text-gray-400">
            Upload at least one document to run the analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
