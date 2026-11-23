import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Language } from '../types';

export interface ToolHeaderProps {
  onReturnToHub?: () => void;
  eyebrow: string;
  tags?: string[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  language?: Language;
}

export function ToolHeader({
  onReturnToHub,
  eyebrow,
  tags = [],
  title,
  subtitle,
  actions,
  language = 'en',
}: ToolHeaderProps) {
  const isEs = language === 'es';

  return (
    <section className="w-full bg-[var(--bg)] border-b border-[var(--line)] py-7 sm:py-8 print:hidden transition-colors">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2.5 max-w-2xl">
          {/* Top Breadcrumb + Eyebrow + Institutional Metadata Tags */}
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.1em]">
            {onReturnToHub && (
              <>
                <button
                  type="button"
                  onClick={onReturnToHub}
                  className="inline-flex items-center gap-1.5 text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                >
                  <ArrowLeft size={12} />
                  <span>{isEs ? 'Volver al Hub' : 'Tools Hub'}</span>
                </button>
                <span className="text-[var(--line-strong)]" aria-hidden="true">/</span>
              </>
            )}

            <span className="font-semibold text-[var(--accent)]">
              // {eyebrow}
            </span>

            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-[2px] bg-[var(--surface)] border border-[var(--line)] text-[var(--ink-muted)] font-medium tracking-[0.08em]"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="font-sans font-semibold text-2xl sm:text-3xl tracking-[-0.025em] leading-[1.12] text-[var(--ink)]">
            {title}
          </h1>

          {subtitle && (
            <p className="font-sans text-sm text-[var(--ink-muted)] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap font-mono text-xs w-full lg:w-auto lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
