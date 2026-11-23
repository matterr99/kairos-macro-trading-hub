import React, { useState, useRef } from 'react';
import { FileSpreadsheet } from 'lucide-react';

export interface SpreadsheetDropZoneProps {
  title: string;
  badge?: string;
  description: string;
  formats?: string[];
  accept?: string;
  onFileSelected: (file: File) => void;
  externalInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SpreadsheetDropZone({
  title,
  badge,
  description,
  formats = ['.XLSX', '.XLS', '.CSV'],
  accept = '.csv,.xlsx,.xls,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
  onFileSelected,
  externalInputRef,
}: SpreadsheetDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  const triggerBrowse = () => {
    inputRef.current?.click();
  };

  return (
    <div
      onClick={triggerBrowse}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) onFileSelected(file);
      }}
      className={`border border-dashed rounded-[2px] p-5 sm:p-6 transition-colors cursor-pointer group select-none font-mono ${
        isDragOver
          ? 'bg-[var(--surface-2)] border-[var(--accent)]'
          : 'bg-[var(--surface)] border-[var(--line-strong)] hover:border-[var(--accent)]'
      }`}
    >
      {!externalInputRef && (
        <input
          type="file"
          ref={internalInputRef}
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onFileSelected(file);
              e.target.value = '';
            }
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] group-hover:border-[var(--accent)]/50 flex items-center justify-center shrink-0 transition-colors">
            <FileSpreadsheet className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--ink)] text-xs sm:text-sm font-semibold uppercase tracking-[0.06em]">
                {title}
              </span>
              {badge && (
                <span className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--line)] text-[10px] font-semibold uppercase tracking-[0.08em]">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--ink-muted)] font-sans mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {formats.map((ext) => (
            <span
              key={ext}
              className="px-2.5 py-1 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[10px] text-[var(--ink-muted)] font-mono font-semibold uppercase"
            >
              {ext}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
