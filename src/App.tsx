/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { NavigationTab, ToolSubTab, ResearchArticle, Language, Theme } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { TickerTape } from './components/TickerTape';
import { ConsoleView } from './views/ConsoleView';
import { ResearchView } from './views/ResearchView';
import { AcademyView } from './views/AcademyView';
import { ToolsView } from './views/ToolsView';
import { ArticleReaderModal } from './views/ArticleReaderModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('console');
  const [toolsSubTab, setToolsSubTab] = useState<ToolSubTab>('all');
  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('kairos_language');
      if (saved === 'es' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const savedTheme = localStorage.getItem('kairos_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem('kairos_language', language);
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem('kairos_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.remove('light-theme');
        document.documentElement.classList.add('dark');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'es' : 'en'));
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTabChange = (tab: NavigationTab, subTab?: ToolSubTab) => {
    if (subTab === 'central-banks') {
      window.open('https://central-bank-tool.onrender.com/', '_blank');
      return;
    }
    setCurrentTab(tab);
    if (subTab) {
      setToolsSubTab(subTab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`${theme === 'light' ? 'light-theme bg-[#f8fafc] text-slate-800' : 'bg-[#020203] text-zinc-300'} min-h-screen flex flex-col font-sans selection:bg-cyan-900 selection:text-cyan-100 transition-colors duration-200`}>
      {/* 1. TOP HEADER WITH WORLD CLOCKS & NAVIGATION */}
      <div className="print:hidden">
        <Header
          currentTab={currentTab}
          onSelectTab={handleTabChange}
          language={language}
          onToggleLanguage={toggleLanguage}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        {/* 2. CURRENCIES VALUATION TICKER TAPE BAR */}
        <TickerTape language={language} theme={theme} />
      </div>

      {/* 3. ACTIVE VIEW */}
      <main className="flex-grow w-full">
        {currentTab === 'console' && (
          <ConsoleView
            onSelectTab={handleTabChange}
            onOpenArticle={setSelectedArticle}
            language={language}
          />
        )}

        {currentTab === 'research' && (
          <ResearchView
            onOpenArticle={setSelectedArticle}
            language={language}
          />
        )}

        {currentTab === 'academy' && <AcademyView language={language} />}

        {currentTab === 'tools' && (
          <ToolsView
            initialSubTab={toolsSubTab}
            onSubTabChange={(sub) => setToolsSubTab(sub)}
            language={language}
          />
        )}
      </main>

      {/* 4. FOOTER */}
      <div className="print:hidden">
        <Footer onSelectTab={handleTabChange} language={language} />
      </div>

      {/* 5. ARTICLE READER MODAL */}
      {selectedArticle && (
        <ArticleReaderModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          language={language}
        />
      )}
    </div>
  );
}
