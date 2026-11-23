import { useState } from 'react';
import { ArrowRight, Search, X } from 'lucide-react';
import { ResearchArticle, Language } from '../types';
import { RESEARCH_ARTICLES } from '../data/macroData';
import { RESEARCH_ARTICLES_ES, TRANSLATIONS } from '../locales/translations';

interface ResearchViewProps {
  onOpenArticle: (article: ResearchArticle) => void;
  language?: Language;
}

export function ResearchView({ onOpenArticle, language = 'en' }: ResearchViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const t = TRANSLATIONS[language];
  const articles = language === 'es' ? RESEARCH_ARTICLES_ES : RESEARCH_ARTICLES;

  const categories = language === 'es'
    ? ['Todas', 'Macro vs. Técnico', 'Política de Bancos Centrales', 'Dinámica de Rendimiento y Carry']
    : ['All', 'Macro vs. Technical', 'Central Bank Policy', 'Yield & Carry Dynamics'];

  const isAll = selectedCategory === 'All' || selectedCategory === 'Todas';

  const filteredArticles = articles.filter((article) => {
    const matchesCategory = isAll || article.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      article.title.toLowerCase().includes(q) || article.summary.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = articles.find((a) => a.featured) || articles[0];
  const showFeatured = !searchQuery && isAll;
  const listArticles = showFeatured
    ? filteredArticles.filter((a) => a.id !== featuredArticle.id)
    : filteredArticles;

  const resetFilters = () => {
    setSelectedCategory(language === 'es' ? 'Todas' : 'All');
    setSearchQuery('');
  };

  return (
    <div className="w-full flex flex-col bg-[var(--bg)] text-[var(--ink)] font-sans antialiased transition-colors">
      
      {/* PAGE HEADER */}
      <section className="w-full border-b border-[var(--line)] py-8 sm:py-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
                // {t.research.badge}
              </span>
              <h1 className="font-sans font-semibold text-2xl sm:text-3xl lg:text-4xl tracking-[-0.025em] leading-[1.1]">
                {t.research.title}
              </h1>
              <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
                {t.research.subtitle}
              </p>
            </div>

            {/* Sharp Architectural Search Input */}
            <div className="w-full md:w-80 relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.research.searchPlaceholder}
                className="w-full h-10 pl-10 pr-9 rounded-[2px] bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--accent)] text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURAL CATEGORY TABS BAR (MATCHES HEADER & TOOLS) */}
      <div className="w-full bg-[var(--bg)] border-b border-[var(--line)] sticky top-12 z-30 transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-fit max-w-full h-11 flex items-stretch overflow-x-auto no-scrollbar touch-scroll divide-x divide-[var(--line)] border-x border-[var(--line)]">
            {categories.map((cat, i) => {
              const active = i === 0 ? isAll : selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 h-full flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'border-[var(--ink)] text-[var(--ink)] bg-[var(--surface)]'
                      : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ARTICLES CONTENT */}
      <section className="w-full py-10 sm:py-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          {/* Featured Case Study / Dossier Spotlight */}
          {showFeatured && (
            <div
              onClick={() => onOpenArticle(featuredArticle)}
              className="group bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--line-strong)] rounded-[2px] p-6 sm:p-10 cursor-pointer relative transition-colors"
            >
              <div className="space-y-4 max-w-3xl">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)]">
                  <span className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--accent)] font-semibold uppercase tracking-[0.08em]">
                    {featuredArticle.category}
                  </span>
                  <span>{featuredArticle.date}</span>
                  <span>/</span>
                  <span>{featuredArticle.readTime}</span>
                </div>

                <h2 className="font-sans font-semibold text-2xl sm:text-3xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors tracking-[-0.02em] leading-snug">
                  {featuredArticle.title}
                </h2>

                <p className="text-[var(--ink-muted)] text-sm sm:text-base leading-relaxed font-normal">
                  {featuredArticle.summary}
                </p>

                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 h-9 px-4 rounded-[2px] bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold uppercase tracking-[0.08em] pointer-events-none">
                    <span>{t.research.openComplete}</span>
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Archive Grid */}
          {listArticles.length > 0 && (
            <div className="pt-2 flex items-baseline justify-between border-b border-[var(--line)] pb-4">
              <h2 className="font-sans font-semibold text-xl tracking-[-0.02em]">
                {t.research.archiveTitle}{' '}
                <span className="font-mono text-[var(--ink-muted)] font-normal text-sm tabular-nums">({filteredArticles.length})</span>
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {listArticles.map((art) => (
              <div
                key={art.id}
                onClick={() => onOpenArticle(art)}
                className="group bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--line-strong)] rounded-[2px] p-6 cursor-pointer flex flex-col justify-between text-left transition-colors"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-3">
                    <span className="text-[var(--accent)] font-semibold">{art.category}</span>
                    <span>/</span>
                    <span>{art.date}</span>
                    <span>/</span>
                    <span>{art.readTime}</span>
                  </div>

                  <h3 className="font-sans font-semibold text-lg text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors tracking-[-0.015em] leading-snug">
                    {art.title}
                  </h3>

                  <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink-muted)] line-clamp-3">
                    {art.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)] group-hover:text-[var(--ink)] transition-colors">
                    {t.research.readDossier}
                  </span>
                  <ArrowRight size={14} className="text-[var(--accent)] transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <div className="text-center py-16 bg-[var(--surface)] border border-[var(--line)] rounded-[2px] space-y-4">
              <p className="text-[var(--ink-muted)] text-sm">{t.research.noResults}</p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center h-9 px-4 rounded-[2px] bg-[var(--ink)] text-[var(--bg)] text-xs font-semibold uppercase tracking-[0.08em] cursor-pointer hover:opacity-90 transition-opacity"
              >
                {t.research.clearFilters}
              </button>
            </div>
          )}

        </div>
      </section>

    </div>
  );
}
