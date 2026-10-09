import React, { useState } from 'react';
import { NavigationPage } from '../types';

interface HeaderProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenGitHubModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onNavigate,
  isDark,
  onToggleTheme,
  onOpenGitHubModal
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="h-16 w-full px-4 md:px-8 lg:px-12 flex items-center justify-between">
        {/* Brand Lockup */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none"
          onClick={() => onNavigate('home')}
        >
          <div className="p-1 border border-white/[0.1] bg-[#0e0e11] flex items-center justify-center">
            <img
              alt="PR Court Monogram Logo"
              className="h-7 w-auto object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1U-4WlJyEZhq3VMIaosiKXAEPupuMdO6CtENfz2-uE9AISRIQsXcnyiADty9oisBllHPx5tX2XgT1G1oddiPwx1GmMe70uoqH7nlmM64f4X7LcltL99aMiEucBhh-pBRYh91DbPNR6GmZzknnwKadazqBWe-CQ_Bd34Xcyed0v0dj30R9L-j2R7qfN6-iBGIipBYseqThVqMf8lIj08THa2c8sBETtuXDOTqmSbUYYgWhhAB1Dlrs7jt1OQ"
              onError={(e) => {
                // In case image fails, fallback to clean text monogram
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="font-serif text-white font-bold text-sm px-1.5 hidden [img:hidden+&]:inline-block">
              P·C
            </span>
          </div>
          <span className="font-serif text-lg uppercase tracking-tight text-white font-semibold">
            PR Court
          </span>
          <span className="hidden lg:inline-block border border-white/[0.08] font-mono text-[10px] uppercase px-2 py-[2px] text-zinc-400">
            Docket//Tribunal
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-wider">
          <button
            onClick={() => onNavigate('home')}
            className={`transition-colors py-2 relative ${
              currentPage === 'home'
                ? "text-white font-semibold after:content-[''] after:absolute after:-bottom-[23px] after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0 after:border-l-[4px] after:border-l-transparent after:border-r-[4px] after:border-r-transparent after:border-t-[4px] after:border-t-white"
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('the-court')}
            className={`transition-colors py-2 relative ${
              currentPage === 'the-court'
                ? "text-white font-semibold after:content-[''] after:absolute after:-bottom-[23px] after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0 after:border-l-[4px] after:border-l-transparent after:border-r-[4px] after:border-r-transparent after:border-t-[4px] after:border-t-white"
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            The Court
          </button>
          <button
            onClick={() => onNavigate('verdicts')}
            className={`transition-colors py-2 relative ${
              currentPage === 'verdicts'
                ? "text-white font-semibold after:content-[''] after:absolute after:-bottom-[23px] after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0 after:border-l-[4px] after:border-l-transparent after:border-r-[4px] after:border-r-transparent after:border-t-[4px] after:border-t-white"
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Verdicts
          </button>
          <button
            onClick={() => onNavigate('about')}
            className={`transition-colors py-2 relative ${
              currentPage === 'about'
                ? "text-white font-semibold after:content-[''] after:absolute after:-bottom-[23px] after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0 after:border-l-[4px] after:border-l-transparent after:border-r-[4px] after:border-r-transparent after:border-t-[4px] after:border-t-white"
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            About
          </button>
        </nav>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          {/* Light / Dark Mode Toggle */}
          <div className="flex items-center border border-white/[0.08] bg-[#0e0e11] p-[2px]">
            <button
              onClick={() => {
                if (isDark) onToggleTheme();
              }}
              aria-label="Theme Toggle Light"
              className={`p-1 flex items-center justify-center transition-colors ${
                !isDark ? 'text-black bg-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">light_mode</span>
            </button>
            <button
              onClick={() => {
                if (!isDark) onToggleTheme();
              }}
              aria-label="Theme Toggle Dark"
              className={`p-1 flex items-center justify-center transition-colors ${
                isDark ? 'text-white bg-[#2a2a2d]' : 'text-zinc-400 hover:text-zinc-800'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">dark_mode</span>
            </button>
          </div>

          {/* Install GitHub App */}
          <button
            onClick={onOpenGitHubModal}
            className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 border border-white/[0.12] hover:border-white/40 bg-transparent text-white font-mono text-xs uppercase tracking-wider transition-colors"
          >
            <span>Install GitHub App</span>
            <span className="material-symbols-outlined text-[14px]">terminal</span>
          </button>

          {/* Profile / Auditor Key */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="w-8 h-8 rounded-full bg-[#c9c6c5] hover:bg-white flex items-center justify-center text-black transition-colors"
              aria-label="User Profile"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0e0e11] border border-white/20 p-4 font-mono text-xs text-white shadow-2xl z-50">
                <div className="pb-2 border-b border-white/10 mb-2">
                  <div className="font-semibold text-zinc-200">Principal Auditor</div>
                  <div className="text-[10px] text-zinc-500">pb9072632@gmail.com</div>
                </div>
                <div className="space-y-1.5 text-[11px] text-zinc-400 mb-3">
                  <div>ROLE: Lead Tribunal Proctor</div>
                  <div>SECURITY CLEARANCE: TIER-1</div>
                  <div>ACTIVE RUNTIMES: 4 microVMs</div>
                </div>
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenGitHubModal();
                  }}
                  className="w-full py-1.5 text-center bg-white text-black text-[11px] uppercase font-semibold hover:bg-zinc-200"
                >
                  Manage Repositories
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-zinc-300 hover:text-white p-1"
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0a0a0a] px-4 py-4 space-y-3 font-mono text-xs uppercase">
          <button
            onClick={() => {
              onNavigate('home');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 text-zinc-300 hover:text-white"
          >
            Home
          </button>
          <button
            onClick={() => {
              onNavigate('the-court');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 text-zinc-300 hover:text-white"
          >
            The Court
          </button>
          <button
            onClick={() => {
              onNavigate('verdicts');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 text-zinc-300 hover:text-white"
          >
            Verdicts
          </button>
          <button
            onClick={() => {
              onNavigate('about');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-1.5 text-zinc-300 hover:text-white"
          >
            About
          </button>
          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenGitHubModal();
              }}
              className="w-full py-2 bg-white text-black font-semibold uppercase text-center"
            >
              Install GitHub App
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
