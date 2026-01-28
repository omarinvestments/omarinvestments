'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface LlcOption {
  id: string;
  legalName: string;
}

interface LlcSwitcherProps {
  currentLlcId: string;
  currentName: string;
}

export default function LlcSwitcher({ currentLlcId, currentName }: LlcSwitcherProps) {
  const [llcs, setLlcs] = useState<LlcOption[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchLlcs() {
      try {
        const res = await fetch('/api/llcs');
        const data = await res.json();
        if (data.ok) {
          setLlcs(data.data);
        }
      } catch {
        // silently fail
      }
    }
    fetchLlcs();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const otherLlcs = llcs.filter((llc) => llc.id !== currentLlcId);

  if (otherLlcs.length === 0) {
    return (
      <div className="font-semibold text-sm truncate">
        {currentName}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 font-semibold text-sm truncate hover:opacity-80 transition-opacity"
      >
        <span className="truncate">{currentName}</span>
        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-card border rounded-md shadow-lg z-50">
          <div className="py-1">
            {llcs.map((llc) => (
              <button
                key={llc.id}
                onClick={() => {
                  router.push(`/llcs/${llc.id}`);
                  setOpen(false);
                }}
                className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                  llc.id === currentLlcId
                    ? 'bg-secondary font-medium'
                    : 'hover:bg-secondary/50'
                }`}
              >
                {llc.legalName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
