// centinela-frontend/useCaseFile.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getManuscriptResults,
  getManuscriptStatus,
  getUploadUrl,
  uploadFileToStorage,
} from "./src/api/manuscripts";  // ← Importar desde src/
import type { CaseFile, ManuscriptResultsResponse } from "./src/types/manuscript";  // ← Importar desde src/

const POLL_INTERVAL_MS = 3000;

interface UseCaseFileReturn {
  caseFile: CaseFile | null;
  results: ManuscriptResultsResponse | null;
  error: string | null;
  submit: (file: File) => Promise<void>;
  reset: () => void;
}

/**
 * Orquesta el flujo completo descrito en el Manifiesto de API:
 * 1. Pide upload-url
 * 2. Sube el archivo (PUT a la presigned URL)
 * 3. Hace polling cada 3s a /manuscripts/{id} hasta status === COMPLETED
 * 4. Pide /manuscripts/{id}/results
 */
export function useCaseFile(): UseCaseFileReturn {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [results, setResults] = useState<ManuscriptResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCompletedRef = useRef<boolean>(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const submit = useCallback(
    async (file: File) => {
      setError(null);
      setResults(null);
      isCompletedRef.current = false;

      try {
        const { manuscriptId, uploadUrl } = await getUploadUrl({
          fileName: file.name,
          contentType: file.type || "application/pdf",
        });

        console.log("[DEBUG] Manuscript ID:", manuscriptId);

        setCaseFile({
          manuscriptId,
          fileName: file.name,
          status: "PENDING",
          progress: { totalBatches: 0, processedBatches: 0 },
          globalIntegrityIndex: null,
          createdAt: Date.now(),
        });

        await uploadFileToStorage(uploadUrl, file);
        console.log("[DEBUG] Archivo subido exitosamente");

        setCaseFile((prev) => (prev ? { ...prev, status: "PROCESSING" } : prev));

        stopPolling();

        pollRef.current = setInterval(async () => {
          try {
            if (isCompletedRef.current) {
              return;
            }

            const status = await getManuscriptStatus(manuscriptId);
            console.log("[DEBUG] Polling status:", status);

            const currentStatus = String(status.status).toUpperCase().trim();
            console.log("[DEBUG] Status normalizado:", currentStatus);

            setCaseFile({
              manuscriptId: status.manuscriptId,
              fileName: status.fileName,
              status: status.status,
              progress: status.progress,
              globalIntegrityIndex: status.globalIntegrityIndex,
              topic: status.topic,
              createdAt: Date.now(),
            });

            if (currentStatus === "COMPLETED" || currentStatus === "COMPLETADO") {
              console.log("[DEBUG] 🎉 Manuscrito COMPLETADO!");
              isCompletedRef.current = true;
              stopPolling();

              try {
                console.log("[DEBUG] Obteniendo resultados...");
                const finalResults = await getManuscriptResults(manuscriptId);
                console.log("[DEBUG] Resultados obtenidos:", finalResults);
                setResults(finalResults);
              } catch (resultsError) {
                console.error("[ERROR] Error al obtener resultados:", resultsError);
                setError("Error al obtener los resultados del análisis.");
              }
              return;
            }

            if (currentStatus === "ERROR" || currentStatus === "FAILED") {
              console.log("[DEBUG] ❌ Manuscrito en ERROR");
              stopPolling();
              setError("El análisis no pudo completarse. Intenta con otro archivo.");
            }

          } catch (err) {
            console.error("[DEBUG] Error en polling:", err);
          }
        }, POLL_INTERVAL_MS);

      } catch (err) {
        console.error("[DEBUG] Error al iniciar subida:", err);
        setError("No se pudo iniciar la subida. Verifica tu conexión e intenta de nuevo.");
      }
    },
    [stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    isCompletedRef.current = false;
    setCaseFile(null);
    setResults(null);
    setError(null);
  }, [stopPolling]);

  return { caseFile, results, error, submit, reset };
}