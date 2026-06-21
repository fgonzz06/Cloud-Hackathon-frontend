// Mock del backend mientras se conecta el API Gateway real.
// Implementa exactamente el contrato de "Manifiesto de API: Proyecto Centinela" v1.0.0
//
// Para conectar al backend real: solo hay que reemplazar el contenido de cada
// función por un fetch() al endpoint correspondiente. Las firmas (tipos de entrada
// y salida) ya están listas para eso, no debería requerir tocar componentes.

import type {
  EvaluationResult,
  ManuscriptResultsResponse,
  ManuscriptStatusResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from "../types/manuscript";

const SIMULATED_NETWORK_DELAY_MS = 600;
const TOTAL_BATCHES_DEMO = 4;
const BATCH_DURATION_MS = 2200;

const TOPICS = ["medicina", "biotecnologia", "ingenieria", "general"] as const;

const MOCK_CITATIONS: Array<Omit<EvaluationResult, "referenceId">> = [
  {
    citationText:
      "Smith, J. (2021). Vacunas experimentales y su efecto adverso. Journal of Fake Science, 12.",
    isZombie: true,
    analysisContext:
      "El artículo original fue retractado en 2022 por manipulación de datos estadísticos. El manuscrito cita la conclusión como hecho válido, ignorando la retractación.",
  },
  {
    citationText: "Doe, E. (2023). Integridad de datos biométricos. Nature Tech, 45.",
    isZombie: false,
    analysisContext:
      "La cita corresponde a un artículo vigente. No hay registros de retractación asociados.",
  },
  {
    citationText:
      "Pérez, L. (2019). Efectos a largo plazo de terapias génicas no reguladas. Cell Reports Express, 8.",
    isZombie: true,
    analysisContext:
      "Retractado en 2020 por conflicto de interés no declarado del autor principal. El manuscrito lo cita sin advertir la retractación.",
  },
  {
    citationText: "Tanaka, H. (2022). Modelos predictivos en bioingeniería estructural. IEEE Trans.",
    isZombie: false,
    analysisContext: "Publicación vigente, sin notas editoriales ni retractación.",
  },
  {
    citationText:
      "Müller, K. (2018). Resultados preliminares de fase III en inmunoterapia. Medical Frontiers, 33.",
    isZombie: true,
    analysisContext:
      "Retractado en 2021 tras no poder reproducirse los resultados en estudios independientes.",
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uuid() {
  return crypto.randomUUID();
}

interface MockManuscriptState {
  fileName: string;
  startedAt: number;
  totalBatches: number;
}

// Almacén en memoria: simula la tabla Manuscripts de DynamoDB durante la sesión.
const mockStore = new Map<string, MockManuscriptState>();

/**
 * POST /api/v1/manuscripts/upload-url
 * En producción: el backend genera una Presigned URL de S3.
 * Aquí: registramos el manuscrito en el store mock y devolvemos una URL falsa.
 */
export async function getUploadUrl(req: UploadUrlRequest): Promise<UploadUrlResponse> {
  await delay(SIMULATED_NETWORK_DELAY_MS);

  const manuscriptId = uuid();
  const ext = req.fileName.includes(".") ? req.fileName.split(".").pop() : "pdf";
  const fileKey = `raw/${manuscriptId}.${ext}`;

  mockStore.set(manuscriptId, {
    fileName: req.fileName,
    startedAt: Date.now(),
    totalBatches: TOTAL_BATCHES_DEMO,
  });

  return {
    manuscriptId,
    fileKey,
    uploadUrl: `https://mock-s3.local/centinela-raw-bucket/${fileKey}`,
  };
}

/**
 * En producción este PUT va directo a S3 con la presigned URL.
 * Aquí solo simulamos la subida (no hay backend real que la reciba).
 */
export async function uploadFileToStorage(_uploadUrl: string, _file: File): Promise<void> {
  await delay(SIMULATED_NETWORK_DELAY_MS);
}

/**
 * GET /api/v1/manuscripts/{manuscriptId}
 * Simula el avance de lotes en función del tiempo transcurrido desde la subida.
 */
export async function getManuscriptStatus(
  manuscriptId: string,
): Promise<ManuscriptStatusResponse> {
  await delay(300);

  const state = mockStore.get(manuscriptId);
  if (!state) {
    throw new Error(`Manuscrito ${manuscriptId} no encontrado`);
  }

  const elapsed = Date.now() - state.startedAt;
  const processedBatches = Math.min(
    state.totalBatches,
    Math.floor(elapsed / BATCH_DURATION_MS),
  );
  const isComplete = processedBatches >= state.totalBatches;

  // Tema determinístico por sesión (simula lo que ya decidió la Lambda Clasificador)
  const topicIndex = Math.abs(hashString(manuscriptId)) % TOPICS.length;

  return {
    manuscriptId,
    fileName: state.fileName,
    status: isComplete ? "COMPLETED" : "PROCESSING",
    progress: {
      totalBatches: state.totalBatches,
      processedBatches,
    },
    globalIntegrityIndex: isComplete ? computeIntegrityIndex(manuscriptId) : null,
    topic: TOPICS[topicIndex],
  };
}

/**
 * GET /api/v1/manuscripts/{manuscriptId}/results
 */
export async function getManuscriptResults(
  manuscriptId: string,
): Promise<ManuscriptResultsResponse> {
  await delay(SIMULATED_NETWORK_DELAY_MS);

  const results: EvaluationResult[] = MOCK_CITATIONS.map((c) => ({
    ...c,
    referenceId: uuid(),
  }));

  const zombieCount = results.filter((r) => r.isZombie).length;

  return {
    manuscriptId,
    totalEvaluated: results.length,
    zombieCount,
    results,
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function computeIntegrityIndex(manuscriptId: string): number {
  const base = 70 + (Math.abs(hashString(manuscriptId)) % 25);
  return Math.round(base * 10) / 10;
}
