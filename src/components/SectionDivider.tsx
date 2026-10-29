import React from 'react';

interface SectionDividerProps {
  label?: string;
  className?: string;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({ className = '' }) => {
  return (
    <div className={`w-full h-px bg-zinc-800/40 print:hidden ${className}`} />
  );
};


