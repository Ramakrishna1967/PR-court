import React, { useState } from 'react';
import { FAQ_ITEMS } from '../data/mockData';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <span className="tracking-widest text-[10px] font-telemetry-code text-zinc-400 uppercase py-1 px-3 border border-white/10 inline-block bg-[#0e0e11]">
          QUESTIONS, ANSWERED
        </span>
      </div>
      <div className="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={idx} className="py-5">
              <button
                type="button"
                onClick={() => toggleIndex(idx)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between text-left focus:outline-none group cursor-pointer"
              >
                <span className="font-serif text-base md:text-lg text-white group-hover:text-zinc-300 transition-colors">
                  {item.question}
                </span>
                <span
                  className={`material-symbols-outlined text-zinc-400 text-xl transform transition-transform duration-300 ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                >
                  add
                </span>
              </button>
              {isOpen && (
                <div className="mt-3 text-sm text-zinc-400 leading-relaxed font-mono">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
