export type ManuscriptStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";

export interface UploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface UploadUrlResponse {
  manuscriptId: string;
  fileKey: string;
  uploadUrl: string;
}

export interface ManuscriptProgress {
  totalBatches: number;
  processedBatches: number;
}

export interface ManuscriptStatusResponse {
  manuscriptId: string;
  fileName: string;
  status: ManuscriptStatus;
  progress: ManuscriptProgress;
  globalIntegrityIndex: number | null;
  topic?: string;
}

export interface EvaluationResult {
  referenceId: string;
  citationText: string;
  isZombie: boolean;
  analysisContext: string;
}

export interface ManuscriptResultsResponse {
  manuscriptId: string;
  totalEvaluated: number;
  zombieCount: number;
  results: EvaluationResult[];
}

export interface CaseFile {
  manuscriptId: string;
  fileName: string;
  status: ManuscriptStatus;
  progress: ManuscriptProgress;
  globalIntegrityIndex: number | null;
  topic?: string;
  createdAt: number;
}
