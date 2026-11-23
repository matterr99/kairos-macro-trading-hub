import { Sparkles, ArrowRight } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface AcademyViewProps {
  language?: Language;
}

export function AcademyView({ language = 'en' }: AcademyViewProps) {
  const t = TRANSLATIONS[language];

  return (
    <div className="w-full min-h-[75vh] flex items-center justify-center py-20 px-5 relative bg-[var(--bg)] overflow-hidden transition-colors">
      
      {/* Aurora glow */}
      <div className="aurora-background">
        <div className="glow-blob cyan-blob" style={{ top: '20%', left: '20%' }} />
        <div className="glow-blob orange-blob" style={{ bottom: '10%', right: '20%' }} />
      </div>

      <div className="max-w-xl w-full text-center space-y-6 p-8 sm:p-14 macro-panel relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)]">
          <Sparkles size={14} className="text-cyan-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-500">
            {t.academy.badge}
          </span>
        </div>

        <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight leading-tight">
          {t.academy.title}
        </h1>

        <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
          {t.academy.description}
        </p>

        <div className="pt-2">
          <button
            onClick={() => window.location.href = '#'}
            className="ui-button btn-arrow mx-auto"
          >
            <span>{language === 'es' ? 'Volver al Inicio' : 'Return to Console'}</span>
            <span className="icon-arrow-badge">
              <ArrowRight size={13} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
