import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { TheCourtView } from './views/TheCourtView';
import { VerdictsView } from './views/VerdictsView';
import { AboutView } from './views/AboutView';
import { PutOnTrialModal } from './components/PutOnTrialModal';
import { GitHubAppModal } from './components/GitHubAppModal';
import { INITIAL_TRIAL_CASES } from './data/mockData';
import { NavigationPage, TrialCase } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('home');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isTrialModalOpen, setIsTrialModalOpen] = useState<boolean>(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState<boolean>(false);
  const [cases, setCases] = useState<TrialCase[]>(INITIAL_TRIAL_CASES);

  // Sync dark class on html root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleAddTrialCase = (newCase: TrialCase) => {
    setCases((prev) => [newCase, ...prev]);
  };

  const handleAppealCase = (caseId: string) => {
    setCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: 'APPEALED',
              determinationSummary: 'APPEAL UNDER ACTIVE TRIBUNAL REVIEW'
            }
          : c
      )
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e4e1e6] flex flex-col relative selection:bg-[#39393c] selection:text-white">
      {/* Blueprint Grid Background Pattern */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,#1f1f22_0%,transparent_60%)] opacity-30" />
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />

      {/* Fixed Header */}
      <Header
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="w-full pt-16 flex-1 relative z-10">
        {currentPage === 'home' && (
          <HomeView
            onOpenTrialModal={() => setIsTrialModalOpen(true)}
            onNavigate={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        {currentPage === 'the-court' && (
          <TheCourtView onOpenTrialModal={() => setIsTrialModalOpen(true)} />
        )}
        {currentPage === 'verdicts' && (
          <VerdictsView
            cases={cases}
            onOpenTrialModal={() => setIsTrialModalOpen(true)}
            onAppealCase={handleAppealCase}
          />
        )}
        {currentPage === 'about' && (
          <AboutView onOpenTrialModal={() => setIsTrialModalOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavigate={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      {/* Modals */}
      <PutOnTrialModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        onTrialSubmitted={handleAddTrialCase}
      />

      <GitHubAppModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
}
