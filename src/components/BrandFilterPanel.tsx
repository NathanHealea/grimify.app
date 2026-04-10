'use client';

import { brands } from '@/data/index';
import { selectIsFiltered, useFilterStore } from '@/stores/useFilterStore';
import { usePaintStore } from '@/stores/usePaintStore';
import Button from './Button';

export default function BrandFilterPanel() {
  const brandFilter = useFilterStore((s) => s.brandFilter);
  const isFiltered = useFilterStore(selectIsFiltered);
  const toggleBrand = useFilterStore((s) => s.toggleBrand);

const isFilterActive = (id: string) => (brandFilter.size > 0 && brandFilter.has(id));

  const handleToggleBrand = (id: string) => {
    toggleBrand(id);
    usePaintStore.getState().clearSelection();
  };


  return (
    <section>
      <h3 className='mb-2 text-xs font-semibold uppercase text-base-content/60'>Brand Filter</h3>
      <div className='flex flex-col gap-2'>
        <Button
          variant='outline'
          color='primary'
          className={'justify-start'}
          active={!isFiltered}
          onClick={() => handleToggleBrand('all')}>
          All Brands
        </Button>
        {brands.map((brand) => (
          <Button
            key={brand.id}
            variant='outline'
            customColor={brand.color}
            className={'justify-start'}
            active={isFilterActive(brand.id)}
            onClick={() => handleToggleBrand(brand.id)}>
            {brand.icon} {brand.name}
          </Button>
        ))}
      </div>
    </section>
  );
}
