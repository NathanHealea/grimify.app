import { brands } from '@/data/index';
import { useCollectionStore } from '@/stores/useCollectionStore';
import type { ProcessedPaint } from '@/types/paint';
import { hexToHsl } from '@/utils/colorUtils';
import Button from './Button';

interface DetailPanelProps {
  group: { key: string; paints: ProcessedPaint[]; rep: ProcessedPaint } | null;
  selectedPaint: ProcessedPaint | null;
  onSelectPaint: (paint: ProcessedPaint) => void;
  onBack: () => void;
  matches: ProcessedPaint[];
  hasSearch: boolean;
  scheme: string;
}

function HslSliders({ hex }: { hex: string }) {
  const hsl = hexToHsl(hex);

  const sliders = [
    {
      label: 'H',
      value: Math.round(hsl.h),
      unit: '\u00B0',
      percent: (hsl.h / 360) * 100,
      gradient: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
    },
    {
      label: 'S',
      value: Math.round(hsl.s * 100),
      unit: '%',
      percent: hsl.s * 100,
      gradient: `linear-gradient(to right, #888, ${hex})`,
    },
    {
      label: 'L',
      value: Math.round(hsl.l * 100),
      unit: '%',
      percent: hsl.l * 100,
      gradient: 'linear-gradient(to right, #000, #888, #fff)',
    },
  ];

  return (
    <div className='flex flex-col gap-1'>
      {sliders.map(({ label, value, unit, percent, gradient }) => (
        <div key={label} className='flex items-center gap-2'>
          <span className='w-3 text-[8px] text-base-content/40'>{label}</span>
          <div className='relative h-2 flex-1 rounded-full' style={{ background: gradient }}>
            <div
              className='absolute -top-0.5 h-3 w-1 rounded-sm border border-black bg-white'
              style={{ left: `${percent}%`, transform: 'translateX(-1px)' }}
            />
          </div>
          <span className='w-8 text-right font-mono text-[10px] text-base-content/60'>
            {value}
            {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

function MatchesList({
  matches,
  hasSearch,
  scheme,
  onSelectPaint,
}: {
  matches: ProcessedPaint[];
  hasSearch: boolean;
  scheme: string;
  onSelectPaint: (paint: ProcessedPaint) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div>
      <h4 className='mb-1 text-[9px] font-semibold uppercase tracking-wider text-base-content/40'>
        {hasSearch ? 'Search results' : `${scheme} matches`} ({matches.length})
      </h4>
      <div className='flex max-h-44 flex-col gap-0.5 overflow-y-auto'>
        {matches.map((match) => {
          const matchBrand = brands.find((b) => b.id === match.brand);
          return (
            <Button
              key={match.id}
              variant='ghost'
              className='flex items-center gap-2 rounded px-2 py-1 text-left'
              onClick={() => onSelectPaint(match)}>
              <div className='size-3 shrink-0 rounded border border-base-300' style={{ backgroundColor: match.hex }} />
              <span className='truncate text-xs'>{match.name}</span>
              <span className='ml-auto text-[10px] text-base-content/40'>{matchBrand?.icon}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default function DetailPanel({
  group,
  selectedPaint,
  onSelectPaint,
  onBack,
  matches,
  hasSearch,
  scheme,
}: DetailPanelProps) {
  const ownedIds = useCollectionStore((s) => s.ownedIds);
  const toggleOwned = useCollectionStore((s) => s.toggleOwned);
  const paint = selectedPaint ?? (group?.paints.length === 1 ? group.rep : null);

  /**
   * No paint group selected, show placeholder. This happens when clicking on an empty area of the main view, or when no paint is selected after clicking on a group of 2+ paints (since the group view doesn't have a specific paint selected by default).
   */
  if (!group) {
    return (
      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-3'>
          <div
            className='size-12 shrink-0 rounded-lg border-2 border-base-300'
            style={{ backgroundColor: '#000000' }}
          />
          <div>
            <p className='text-sm font-semibold'>--</p>
            <p className='text-xs text-base-content/60'>--</p>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
          <span className='text-base-content/60'>Type</span>
          <span>--</span>
          <span className='text-base-content/60'>Finish</span>
          <span>--</span>
          <span className='text-base-content/60'>Hex</span>
          <span className='font-mono'>--</span>
          <span className='text-base-content/60'>HSL</span>
          <span className='font-mono'>0° 0% 0%</span>
        </div>
        <HslSliders hex='#000000' />
        {hasSearch && (
          <MatchesList matches={matches} hasSearch={hasSearch} scheme={scheme} onSelectPaint={onSelectPaint} />
        )}
      </div>
    );
  }

  /**
   * If a specific paint is selected (either by clicking a single paint group or selecting from the list), show detailed info and matches. Otherwise show the list of paints in the group.
   */
  if (paint) {
    const brand = brands.find((b) => b.id === paint.brand);
    const hsl = hexToHsl(paint.hex);

    return (
      <div className='flex flex-col gap-3'>
        {group.paints.length > 1 && (
          <button className='btn btn-ghost btn-xs self-start' onClick={onBack}>
            ← Same color ({group.paints.length})
          </button>
        )}
        <div className='flex items-center gap-3'>
          <div
            className='size-12 shrink-0 rounded-lg border-2 border-base-300'
            style={{
              backgroundColor: paint.hex,
              boxShadow: `0 0 18px ${paint.hex}55`,
            }}
          />
          <div>
            <p className='text-sm font-semibold'>{paint.name}</p>
            <p className='text-xs text-base-content/60'>
              {brand?.icon} {brand?.name}
            </p>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-x-4 gap-y-1 text-xs'>
          <span className='text-base-content/60'>Type</span>
          <span>{paint.type}</span>
          <span className='text-base-content/60'>Finish</span>
          <span>Matte</span>
          <span className='text-base-content/60'>Hex</span>
          <span className='font-mono'>{paint.hex.toUpperCase()}</span>
          <span className='text-base-content/60'>HSL</span>
          <span className='font-mono'>
            {Math.round(hsl.h)}° {Math.round(hsl.s * 100)}% {Math.round(hsl.l * 100)}%
          </span>
        </div>
        <HslSliders hex={paint.hex} />
        <Button
          variant='outline'
          color={ownedIds.has(paint.id) ? 'error' : 'default'}
          className={'w-full'}
          onClick={() => toggleOwned(paint.id)}>
          {ownedIds.has(paint.id) ? 'Remove from Collection' : 'Add to Collection'}
        </Button>
        <MatchesList matches={matches} hasSearch={hasSearch} scheme={scheme} onSelectPaint={onSelectPaint} />
      </div>
    );
  }

  /**
   * No specific paint selected, show list of paints in the group. This happens when clicking on a group of 2+ paints in the main view, which are all the same color but may differ in brand, type, etc.
   */
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        <div className='size-6 rounded border border-base-300' style={{ backgroundColor: group.rep.hex }} />
        <p className='text-sm font-semibold'>
          {group.paints.length} paints — {group.rep.hex.toUpperCase()}
        </p>
      </div>
      <div className='flex flex-col gap-1'>
        {group.paints.map((p) => {
          const brand = brands.find((b) => b.id === p.brand);
          return (
            <Button
              key={p.id}
              variant='ghost'
              className='flex items-center gap-2 rounded px-2 py-1 text-left'
              onClick={() => onSelectPaint(p)}>
              <div className='size-4 rounded border border-base-300' style={{ backgroundColor: p.hex }} />
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm'>{p.name}</p>
                <p className='text-xs text-base-content/60'>
                  {brand?.icon} {brand?.name}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
