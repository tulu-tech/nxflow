'use client';

import { PHASES } from '@/lib/seo/types';
import { Check } from 'lucide-react';

interface Props {
  currentPhase: number;
  onSelectPhase: (phase: number) => void;
}

export function PhaseNav({ currentPhase, onSelectPhase }: Props) {
  return (
    <div className="seo-phase-nav">
      {PHASES.map((phase, idx) => {
        const isActive = phase.id === currentPhase;
        const isCompleted = phase.id < currentPhase;

        return (
          <div key={phase.id} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              className={`seo-phase-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => {
                if (phase.id <= currentPhase) onSelectPhase(phase.id);
              }}
              style={{ cursor: phase.id <= currentPhase ? 'pointer' : 'default', opacity: phase.id > currentPhase ? 0.4 : 1 }}
            >
              <span className="seo-phase-step-num">
                {isCompleted ? <Check size={12} /> : phase.id}
              </span>
              <span>{phase.shortLabel}</span>
            </button>
            {idx < PHASES.length - 1 && <div className="seo-phase-connector" />}
          </div>
        );
      })}
    </div>
  );
}
