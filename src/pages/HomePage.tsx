import { AlertTriangle } from "lucide-react";
import { Header } from "../components/layout/Header";
import { UploadDropzone } from "../components/upload/UploadDropzone";
import { CaseProgress } from "../components/case/CaseProgress";
import { CaseResults } from "../components/case/CaseResults";
import { ProcessSteps } from "../components/case/ProcessSteps";
import { useCaseFile } from "../hooks/useCaseFile";

export function HomePage() {
  const { caseFile, results, error, submit, reset } = useCaseFile();

  const isIdle = !caseFile;
  const isWorking = caseFile && (caseFile.status === "PENDING" || caseFile.status === "PROCESSING");
  const isDone = caseFile && caseFile.status === "COMPLETED" && results;

  return (
    <div className="grain min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-6 pb-24">
        {isIdle && (
          <>
            <div className="py-20 text-center sm:py-28">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-seal">
                Auditoría bibliográfica automatizada
              </p>
              <h1 className="mx-auto mt-5 max-w-2xl font-display text-4xl leading-[1.15] tracking-tight text-paper sm:text-5xl">
                Toda cita tiene una fuente.
                <br />
                Verifica la suya.
              </h1>
              <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted-ink">
                Centinela revisa cada referencia de tu manuscrito y detecta si
                cita artículos ya retractados, antes de que alguien más lo haga.
              </p>
            </div>

            <UploadDropzone onFileSelected={submit} />

            <div className="mt-20">
              <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-ink">
                Cómo se abre un expediente
              </h2>
              <ProcessSteps />
            </div>
          </>
        )}

        {isWorking && (
          <div className="py-20">
            <CaseProgress caseFile={caseFile} />
          </div>
        )}

        {isDone && (
          <div className="py-16">
            <CaseResults caseFile={caseFile} results={results} onReset={reset} />
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-sm border border-zombie/30 bg-zombie-bg/30 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zombie" strokeWidth={1.5} />
            <div>
              <p className="text-sm text-paper/90">{error}</p>
              <button
                onClick={reset}
                className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zombie underline-offset-4 hover:underline"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-paper/10 px-6 py-6">
        <p className="mx-auto max-w-5xl text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink/60">
          Centinela · Hackathon Cloud · Toda cita tiene una fuente. Verifica la suya.
        </p>
      </footer>
    </div>
  );
}
