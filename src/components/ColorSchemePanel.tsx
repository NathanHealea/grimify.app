'use client';

import { useFilterStore } from '@/stores/useFilterStore';
import { usePaintStore } from '@/stores/usePaintStore';
import Button from './Button';

const SCHEME_OPTIONS = [
  { id: 'complementary', label: 'Complementary' },
  { id: 'split', label: 'Split Complementary' },
  { id: 'analogous', label: 'Analogous' },
] as const;

export default function ColorSchemePanel() {
  const colorScheme = useFilterStore((s) => s.colorScheme);
  const setColorScheme = useFilterStore((s) => s.setColorScheme);
  const selectedPaint = usePaintStore((s) => s.selectedPaint);

  return (
    <section>
      <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Color Scheme</h3>
      <div className='flex flex-col gap-2'>
        <Button
          variant='outline'
          color='primary'
          className={'justify-start'}
          active={colorScheme === 'none' || !colorScheme}
          onClick={() => setColorScheme('none')}>
          None
        </Button>
        {SCHEME_OPTIONS.map(({ id, label }) => (
          <Button
            key={id}
            variant='outline'
            color={id}
            className={'justify-start'}
            active={colorScheme === id}
            
            onClick={() => setColorScheme(id)}>
            {label}
          </Button>
        ))}
      </div>
      {colorScheme !== 'none' && !selectedPaint && (
        <p className='mt-1 text-xs text-base-content/40'>Click a paint to see its {colorScheme} colors</p>
      )}
    </section>
  );
}
