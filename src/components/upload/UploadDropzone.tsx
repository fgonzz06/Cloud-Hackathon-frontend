import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";

interface UploadDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [".pdf", ".docx"];

export function UploadDropzone({ onFileSelected, disabled }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelected(file);
    },
    [disabled, onFileSelected],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
      }}
      aria-disabled={disabled}
      className={`group relative cursor-pointer overflow-hidden rounded-sm border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-seal focus-visible:ring-offset-2 focus-visible:ring-offset-ink ${
        isDragging
          ? "border-seal bg-seal/[0.06]"
          : "border-paper/15 bg-paper/[0.02] hover:border-paper/30 hover:bg-paper/[0.04]"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      {/* Esquinas tipo expediente/folder */}
      <span className="absolute left-0 top-0 h-3 w-3 border-l border-t border-seal/40" />
      <span className="absolute right-0 top-0 h-3 w-3 border-r border-t border-seal/40" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-seal/40" />
      <span className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-seal/40" />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-4 px-10 py-16 text-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition-colors ${
            isDragging ? "border-seal bg-seal/10" : "border-paper/20"
          }`}
        >
          {isDragging ? (
            <FileText className="h-6 w-6 text-seal" strokeWidth={1.5} />
          ) : (
            <UploadCloud
              className="h-6 w-6 text-muted-ink transition-colors group-hover:text-paper"
              strokeWidth={1.5}
            />
          )}
        </div>

        <div>
          <p className="font-display text-xl text-paper">
            {isDragging ? "Suelta el manuscrito" : "Abre un nuevo expediente"}
          </p>
          <p className="mt-1.5 text-sm text-muted-ink">
            Arrastra el manuscrito (PDF) o haz clic para elegirlo
          </p>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-ink/70">
          Sin límite de extensión · Verificación de bibliografía completa
        </p>
      </div>
    </div>
  );
}
