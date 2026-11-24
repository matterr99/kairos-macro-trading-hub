import { useEffect } from 'react';
import { X } from 'lucide-react';
import { ResearchArticle, Language } from '../types';

interface ArticleReaderModalProps {
  article: ResearchArticle | null;
  onClose: () => void;
  language?: Language;
}

export function ArticleReaderModal({ article, onClose, language = 'en' }: ArticleReaderModalProps) {
  useEffect(() => {
    if (!article) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [article, onClose]);

  if (!article) return null;

  const isEs = language === 'es';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="macro-panel max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh] rounded-3xl shadow-2xl border border-[var(--line)]"
      >
        
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-[var(--line)] bg-[var(--surface-solid)] flex items-center justify-between font-mono">
          <div className="flex items-center gap-3">
            <span className="text-cyan-500 font-bold text-[10px] tracking-widest uppercase">
              {isEs ? '// DOSSIER DE INVESTIGACIÓN' : '// RESEARCH DOSSIER'}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400 text-[10px] uppercase font-semibold">
              {article.category}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-[var(--ink)] p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition cursor-pointer flex items-center gap-1 text-xs font-mono"
            aria-label="Close article"
          >
            <span>{isEs ? 'CERRAR' : 'CLOSE'}</span>
            <X size={15} />
          </button>
        </div>

        {/* Article scrollable container */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-8 font-sans">
          
          <header className="space-y-4 border-b border-[var(--line)] pb-8">
            <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
              <span className="bg-cyan-500/10 text-cyan-500 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border border-cyan-500/20">
                {isEs ? 'Informe Institucional' : 'Institutional Brief'}
              </span>
              <span>•</span>
              <span>{article.readTime}</span>
              <span>•</span>
              <span>{isEs ? 'ESTADO: ARCHIVADO' : 'STATUS: ARCHIVED'}</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
              {article.title}
            </h1>

            <p className="text-base text-zinc-400 font-normal leading-relaxed">
              {article.summary}
            </p>
          </header>

          {/* Body Sections */}
          {article.contentSections ? (
            <div className="space-y-8 text-zinc-300 leading-relaxed text-sm sm:text-base font-normal">
              {article.contentSections.map((sec, idx) => (
                <section key={idx} className="space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold font-mono tracking-tight uppercase border-l-2 border-cyan-500 pl-3">
                    {sec.heading}
                  </h2>
                  
                  {sec.subheading && (
                    <h3 className="text-sm font-mono text-cyan-500 font-semibold uppercase">
                      {sec.subheading}
                    </h3>
                  )}

                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="leading-relaxed text-zinc-400">
                      {p}
                    </p>
                  ))}

                  {sec.callout && (
                    <div className="p-4 bg-cyan-500/10 border-l-2 border-cyan-500 text-zinc-300 font-mono text-xs sm:text-sm my-4 rounded-r-xl">
                      {sec.callout}
                    </div>
                  )}

                  {sec.gridItems && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs pt-3">
                      {sec.gridItems.map((g, gIdx) => (
                        <div key={gIdx} className="bg-[var(--surface-solid)] border border-[var(--line)] p-5 space-y-2 rounded-2xl shadow-sm">
                          <div className="text-cyan-500 font-bold uppercase tracking-wider">
                            // {g.title}
                          </div>
                          <p className="font-sans text-zinc-400 leading-relaxed text-xs">
                            {g.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-6 text-zinc-400 font-normal text-sm sm:text-base">
              <p>
                {isEs
                  ? 'En este informe de investigación, el equipo de Kairos explora la interacción sistemática entre la reducción de compras de activos por bancos centrales, las dinámicas de diferenciales de swap y la transmisión a los cruces de divisas del G10.'
                  : 'In this research paper, the Kairos desk explores the systematic interaction between central bank asset purchase unwinds, swap spread dynamics, and the transmission into G10 currency crosses.'}
              </p>
              <div className="p-4 bg-[var(--surface-solid)] border border-[var(--line)] font-mono text-xs text-zinc-400 rounded-xl">
                {isEs
                  ? '// REGISTRO CUANTITATIVO COMPLETO RESTRINGIDO A CLIENTES VERIFICADOS.'
                  : '// FULL QUANTITATIVE LOG RESTRICTED TO VERIFIED CLIENT KEYS.'}
                <br />
                {isEs
                  ? 'Solicita autorización institucional en la pestaña Consola para descargar los parámetros históricos de regresión.'
                  : 'Request institutional API clearance on the Console tab to download raw historical regression parameters and tick data.'}
              </div>
            </div>
          )}

          {/* Footer of modal */}
          <div className="pt-6 border-t border-[var(--line)] flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-xs">
            <span className="text-zinc-500 uppercase text-[10px]">
              // KAIROS GLOBAL RESEARCH ARCHIVES • AUTHENTICATED
            </span>
            <button
              onClick={onClose}
              className="ui-button btn-arrow shadow-sm cursor-pointer"
            >
              <span>{isEs ? 'Cerrar Dossier' : 'Close Dossier'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
