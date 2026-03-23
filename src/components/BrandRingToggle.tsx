'use client'

import { useUIStore } from '@/stores/useUIStore';
import Button from './Button';

export default function BrandRingToggle() {
  const showBrandRing = useUIStore((s) => s.showBrandRing)
  const toggleBrandRing = useUIStore((s) => s.toggleBrandRing)

  return (
    <section>
      <Button
        variant='outline'
        color='primary'
        className={'w-full'}
        active={showBrandRing}
        onClick={toggleBrandRing}>
        Brand Ring
      </Button>
    </section>
  )
}
