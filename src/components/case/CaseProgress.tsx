// centinela-frontend/src/components/case/CaseProgress.tsx
import type { CaseFile } from "../../types/manuscript"; // ← Importar el tipo

interface CaseProgressProps {
  caseFile: CaseFile;
  results?: any; // ← Añadir results como prop opcional
}

const STAGE_LABELS: Record<string, string> = {
  PENDING: "Recibiendo expediente",
  PROCESSING: "Auditando referencias bibliográficas",
  COMPLETED: "✅ Análisis completado",
  ERROR: "❌ Error en el procesamiento",
};

export function CaseProgress({ caseFile, results }: CaseProgressProps) {
  const { progress, status, fileName, topic } = caseFile;
  
  let pct = 0;
  if (status === "PENDING") {
    pct = 4;
  } else if (status === "COMPLETED") {
    pct = 100;
  } else if (progress.totalBatches > 0) {
    pct = Math.round((progress.processedBatches / progress.totalBatches) * 100);
    if (pct === 0) pct = 10;
  } else {
    pct = 10;
  }

  return (
    <div className="rounded-sm border border-paper/12 bg-paper/[0.02] p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-seal">
            Expediente en curso
          </p>
          <h3 className="mt-1.5 truncate font-display text-lg text-paper">{fileName}</h3>
        </div>
        {topic && (
          <span className="shrink-0 rounded-sm border border-paper/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-ink">
            {topic}
          </span>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-ink">
        {STAGE_LABELS[status] ?? "Procesando"}
        {status === "COMPLETED" && (
          <span className="ml-2 text-valid">Índice de integridad: {caseFile.globalIntegrityIndex}%</span>
        )}
      </p>

      <div className="mt-3 h-px w-full overflow-hidden bg-paper/10">
        <div
          className="h-full bg-seal transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted-ink">
        <span>
          {status === "COMPLETED" 
            ? `✅ ${progress.processedBatches} de ${progress.totalBatches || "—"} referencias auditadas`
            : `Lote ${progress.processedBatches} de ${progress.totalBatches || "—"}`}
        </span>
        <span>{pct}%</span>
      </div>

      {status === "COMPLETED" && !results && (
        <p className="mt-2 text-xs text-valid animate-pulse">
          Cargando resultados...
        </p>
      )}
    </div>
  );
}