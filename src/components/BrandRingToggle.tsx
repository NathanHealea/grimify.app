'use client';

interface BrandRingToggleProps {
  showBrandRing: boolean;
  onToggle: () => void;
}

export default function BrandRingToggle({ showBrandRing, onToggle }: BrandRingToggleProps) {
  return (
    <section>
      <button
        className={`btn btn-sm w-full ${showBrandRing ? '' : 'btn-outline'}`}
        style={
          showBrandRing
            ? { backgroundColor: '#6366f1', borderColor: '#6366f1', color: '#fff' }
            : { borderColor: '#6366f1', color: '#6366f1' }
        }
        onClick={onToggle}>
        Brand Ring
      </button>
    </section>
  );
}
