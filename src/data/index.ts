import type { Brand, Paint, PaintEntry } from '@/types/paint';

import akInteractiveData from './paints/ak-interactive.json';
import brandsData from './brands.json';
import armyPainterData from './paints/army-painter.json';
import citadelData from './paints/citadel.json';
import greenStuffWorldData from './paints/green-stuff-world.json';
import vallejoData from './paints/vallejo.json';

const brandPaints: [string, PaintEntry[]][] = [
  ['citadel', citadelData],
  ['army-painter', armyPainterData],
  ['vallejo', vallejoData],
  ['green-stuff-world', greenStuffWorldData],
  ['ak-interactive', akInteractiveData],
];

export const brands: Brand[] = brandsData;

export const paints: Paint[] = brandPaints.flatMap(([brandId, entries]) =>
  entries.map((entry) => ({ ...entry, brand: brandId })),
);
