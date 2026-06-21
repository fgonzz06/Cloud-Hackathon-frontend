// centinela-frontend/src/api/manuscripts/manuscripts.real.ts
import type {
  ManuscriptResultsResponse,
  ManuscriptStatusResponse,
  UploadUrlRequest,
  UploadUrlResponse,
} from "../types/manuscript"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
console.log("[DEBUG] VITE_API_BASE_URL =", JSON.stringify(API_BASE_URL));

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL no está definida. Revisa tu archivo .env (copia .env.example).",
    );
  }
  return API_BASE_URL.replace(/\/$/, "");
}

export async function getUploadUrl(req: UploadUrlRequest): Promise<UploadUrlResponse> {
  const url = `${requireBaseUrl()}/api/v1/manuscripts/upload-url`;
  console.log("[DEBUG] getUploadUrl:", url);
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: req.fileName }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[ERROR] upload-url failed:", res.status, errorText);
    throw new Error(`upload-url falló con status ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  console.log("[DEBUG] upload-url response:", data);
  
  return {
    manuscriptId: data.manuscriptId,
    fileKey: data.fileKey,
    uploadUrl: data.uploadUrl,
  };
}

export async function uploadFileToStorage(uploadUrl: string, file: File): Promise<void> {
  console.log("[DEBUG] Uploading to S3:", uploadUrl);
  
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { 
      "Content-Type": file.type || "application/pdf",
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[ERROR] S3 upload failed:", res.status, errorText);
    throw new Error(`Subida a S3 falló con status ${res.status}: ${errorText}`);
  }
  
  console.log("[DEBUG] S3 upload successful");
}

export async function getManuscriptStatus(
  manuscriptId: string,
): Promise<ManuscriptStatusResponse> {
  const url = `${requireBaseUrl()}/api/v1/manuscripts/${manuscriptId}`;
  console.log("[DEBUG] getManuscriptStatus URL:", url);
  
  try {
    const res = await fetch(url);
    
    if (res.status === 404) {
      console.log("[DEBUG] Manuscrito aún no disponible (404), retornando PROCESSING");
      return {
        manuscriptId,
        fileName: "manuscrito.pdf",
        status: "PROCESSING",
        progress: { totalBatches: 0, processedBatches: 0 },
        globalIntegrityIndex: null,
        topic: undefined,
      };
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("[ERROR] status failed:", res.status, errorText);
      throw new Error(`status falló con status ${res.status}: ${errorText}`);
    }
    
    const raw = await res.json();
    console.log("[DEBUG] Raw status response:", raw);
    
    return normalizeStatus(manuscriptId, raw);
  } catch (error) {
    console.error("[ERROR] getManuscriptStatus error:", error);
    return {
      manuscriptId,
      fileName: "manuscrito.pdf",
      status: "PROCESSING",
      progress: { totalBatches: 0, processedBatches: 0 },
      globalIntegrityIndex: null,
      topic: undefined,
    };
  }
}

function normalizeStatus(manuscriptId: string, raw: any): ManuscriptStatusResponse {
  console.log("[DEBUG] Normalizing status with raw:", raw);
  
  // Si ya tiene el formato nuevo con status
  if (raw.status) {
    const statusRaw = String(raw.status).toUpperCase().trim();
    const statusMap: Record<string, ManuscriptStatusResponse["status"]> = {
      "PENDING": "PENDING",
      "PROCESSING": "PROCESSING",
      "COMPLETED": "COMPLETED",
      "COMPLETADO": "COMPLETED",
      "ERROR": "ERROR",
      "FAILED": "ERROR",
    };
    
    // Obtener progress de donde venga
    let totalBatches = 0;
    let processedBatches = 0;
    
    if (raw.progress) {
      totalBatches = raw.progress.totalBatches || 0;
      processedBatches = raw.progress.processedBatches || 0;
    } else {
      totalBatches = raw.totalRefs || 0;
      processedBatches = raw.refsProcesadas || 0;
    }
    
    return {
      manuscriptId: raw.manuscriptId || manuscriptId,
      fileName: raw.fileName || "manuscrito.pdf",
      status: statusMap[statusRaw] || "PROCESSING",
      progress: {
        totalBatches,
        processedBatches,
      },
      globalIntegrityIndex: raw.globalIntegrityIndex ?? raw.indiceIntegridad ?? null,
      topic: raw.topic || raw.Topic || raw.tema,
    };
  }

  // Fallback: formato antiguo en español
  const estadoRaw = String(raw.estado ?? "PROCESANDO").toUpperCase();
  const statusMap: Record<string, ManuscriptStatusResponse["status"]> = {
    PENDIENTE: "PENDING",
    PENDING: "PENDING",
    PROCESANDO: "PROCESSING",
    PROCESSING: "PROCESSING",
    COMPLETADO: "COMPLETED",
    COMPLETED: "COMPLETED",
    ERROR: "ERROR",
    FAILED: "ERROR",
  };

  const totalBatches = Number(raw.totalRefs ?? 0);
  const processedBatches = Number(raw.refsProcesadas ?? 0);
  const status = statusMap[estadoRaw] ?? "PROCESSING";

  return {
    manuscriptId,
    fileName: raw.fileName ?? raw.nombreArchivo ?? "manuscrito.pdf",
    status,
    progress: { totalBatches, processedBatches },
    globalIntegrityIndex: status === "COMPLETED" ? Number(raw.indiceIntegridad ?? 0) : null,
    topic: raw.tema ?? raw.Topic,
  };
}

export async function getManuscriptResults(
  manuscriptId: string,
): Promise<ManuscriptResultsResponse> {
  const url = `${requireBaseUrl()}/api/v1/manuscripts/${manuscriptId}/results`;
  console.log("[DEBUG] getManuscriptResults URL:", url);
  
  const res = await fetch(url);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error("[ERROR] results failed:", res.status, errorText);
    throw new Error(`results falló con status ${res.status}: ${errorText}`);
  }
  
  const raw = await res.json();
  console.log("[DEBUG] Raw results response:", raw);
  
  return normalizeResults(manuscriptId, raw);
}

function normalizeResults(manuscriptId: string, raw: any): ManuscriptResultsResponse {
  const items: any[] = Array.isArray(raw) ? raw : raw.results ?? raw.items ?? [];

  const results = items.map((item, i) => {
    const isZombie = Boolean(item.estaRetractada ?? false);
    const verificada = Boolean(item.verificada ?? false);
    const contextoBase = String(item.contexto ?? item.citaCruda ?? "");
    
    let analysisContext: string;
    if (isZombie) {
      analysisContext = contextoBase || "Esta referencia corresponde a un artículo retractado.";
    } else if (verificada) {
      analysisContext = "Verificada: no se encontraron registros de retractación para esta referencia.";
    } else {
      analysisContext = "Aún no verificada por el sistema.";
    }

    return {
      referenceId: String(item.referenceId ?? item.refId ?? i + 1),
      citationText: String(
        item.citationText ?? item.citaCruda ?? item.doi ?? "Referencia sin texto disponible",
      ),
      isZombie,
      analysisContext,
    };
  });

  return {
    manuscriptId,
    totalEvaluated: results.length,
    zombieCount: results.filter((r) => r.isZombie).length,
    results,
  };
}