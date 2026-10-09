import React from 'react';
import { NavigationPage } from '../types';

interface FooterProps {
  onNavigate: (page: NavigationPage) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isDark, onToggleTheme }) => {
  return (
    <footer className="w-full bg-[#0a0a0a] border-t border-white/[0.08] relative z-10 font-telemetry-code">
      <div className="w-full px-4 md:px-8 lg:px-12 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="p-1 border border-white/[0.08] bg-[#0e0e11] flex items-center justify-center w-fit">
              <img
                alt="PR Court Monogram Logo"
                className="h-6 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1U-4WlJyEZhq3VMIaosiKXAEPupuMdO6CtENfz2-uE9AISRIQsXcnyiADty9oisBllHPx5tX2XgT1G1oddiPwx1GmMe70uoqH7nlmM64f4X7LcltL99aMiEucBhh-pBRYh91DbPNR6GmZzknnwKadazqBWe-CQ_Bd34Xcyed0v0dj30R9L-j2R7qfN6-iBGIipBYseqThVqMf8lIj08THa2c8sBETtuXDOTqmSbUYYgWhhAB1Dlrs7jt1OQ"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="font-serif text-white text-xs px-1 hidden [img:hidden+&]:inline-block">
                P·C
              </span>
            </div>
            <span className="font-serif text-lg uppercase tracking-tight text-white font-semibold">
              PR Court
            </span>
          </div>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            Every PR, tried by evidence. Unforgiving automated code litigation for high-consequence repositories.
          </p>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="material-symbols-outlined text-[14px]">gavel</span>
            <span>CODE_CIVIL_CODE_V2.1</span>
          </div>
        </div>

        {/* Product links */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white font-semibold mb-2">
            Product
          </span>
          <ul className="flex flex-col gap-2 text-xs text-zinc-400">
            <li>
              <button
                onClick={() => onNavigate('the-court')}
                className="hover:text-white transition-colors"
              >
                The Court
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('verdicts')}
                className="hover:text-white transition-colors"
              >
                Verdicts
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('the-court')}
                className="hover:text-white transition-colors"
              >
                Dialectic Engine
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('the-court')}
                className="hover:text-white transition-colors"
              >
                Rules Engine
              </button>
            </li>
          </ul>
        </div>

        {/* Company links */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white font-semibold mb-2">
            Company
          </span>
          <ul className="flex flex-col gap-2 text-xs text-zinc-400">
            <li>
              <button
                onClick={() => onNavigate('about')}
                className="hover:text-white transition-colors"
              >
                About
              </button>
            </li>
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Careers</span>
            </li>
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Blog</span>
            </li>
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
            </li>
          </ul>
        </div>

        {/* Legal links */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wider text-white font-semibold mb-2">
            Legal & Security
          </span>
          <ul className="flex flex-col gap-2 text-xs text-zinc-400">
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            </li>
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            </li>
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Security Whitepaper</span>
            </li>
            <li>
              <span className="hover:text-white cursor-pointer transition-colors">Soc2 Compliance</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="w-full border-t border-white/[0.08] px-4 md:px-8 lg:px-12 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <div>© 2026 PR Court. All rights reserved.</div>

          <div className="flex items-center gap-2 px-3 py-1 border border-white/[0.08] bg-[#0e0e11]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="uppercase tracking-wider text-white text-[10px]">
              ALL COURTS IN SESSION
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] uppercase">
            <span className="text-zinc-500">Theme:</span>
            <div className="flex items-center border border-white/[0.08] bg-[#0e0e11] p-[2px]">
              <button
                onClick={() => {
                  if (isDark) onToggleTheme();
                }}
                className={`p-1 flex items-center justify-center transition-colors ${
                  !isDark ? 'text-black bg-white' : 'text-zinc-400 hover:text-white'
                }`}
                aria-label="Footer Light Mode"
              >
                <span className="material-symbols-outlined text-[13px]">light_mode</span>
              </button>
              <button
                onClick={() => {
                  if (!isDark) onToggleTheme();
                }}
                className={`p-1 flex items-center justify-center transition-colors ${
                  isDark ? 'text-white bg-[#2a2a2d]' : 'text-zinc-400 hover:text-zinc-800'
                }`}
                aria-label="Footer Dark Mode"
              >
                <span className="material-symbols-outlined text-[13px]">dark_mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
