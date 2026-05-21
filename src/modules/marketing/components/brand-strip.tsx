/** Muted trust strip listing supported paint brands, rendered below the hero search bar. */
export function BrandStrip() {
  const brands = [
    'Citadel',
    'Vallejo',
    'Army Painter',
    'Scale75',
    'Warcolours',
    'Reaper',
    'Monument Hobbies',
  ]
  return (
    <p className="text-xs text-muted-foreground text-center">
      Supports {brands.join(' · ')} and more
    </p>
  )
}
