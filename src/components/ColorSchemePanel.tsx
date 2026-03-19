'use client';

import type { ColorScheme, ProcessedPaint } from '@/types/paint';

const SCHEME_OPTIONS = [
  { label: 'No Scheme', value: 'none', color: '#6b7280', contentColor: '#fff' },
  { label: 'Complementary', value: 'complementary', color: '#38bdf8', contentColor: '#000' },
  { label: 'Split Complementary', value: 'split', color: '#facc15', contentColor: '#000' },
  { label: 'Analogous', value: 'analogous', color: '#4ade80', contentColor: '#000' },
] as const;

interface ColorSchemePanelProps {
  colorScheme: ColorScheme;
  onSchemeChange: (scheme: ColorScheme) => void;
  selectedPaint: ProcessedPaint | null;
}

export default function ColorSchemePanel({ colorScheme, onSchemeChange, selectedPaint }: ColorSchemePanelProps) {
  return (
    <section>
      <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Scheme</h3>
      <div className='flex flex-col gap-1'>
        {SCHEME_OPTIONS.map(({ label, value, color, contentColor }) => (
          <button
            key={value}
            className={`btn btn-sm justify-start ${colorScheme === value ? '' : 'btn-outline'}`}
            style={
              colorScheme === value
                ? { backgroundColor: color, borderColor: color, color: contentColor }
                : { borderColor: color, color }
            }
            onClick={() => onSchemeChange(value)}>
            {label}
          </button>
        ))}
      </div>
      {colorScheme !== 'none' && !selectedPaint && (
        <p className='mt-1 text-xs text-base-content/40'>Click a paint to see its {colorScheme} colors</p>
      )}
    </section>
  );
}
