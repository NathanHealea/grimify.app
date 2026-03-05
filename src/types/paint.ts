/** Raw paint entry shape as stored in JSON files */
export interface PaintEntry {
  name: string;
  hex: string;
  type: string;
}

/** Brand metadata */
export interface Brand {
  id: string;
  name: string;
  icon: string;
  color: string;
  types: string[];
}

/** Processed paint with brand info attached */
export interface Paint extends PaintEntry {
  brand: string;
}

/** Paint with computed wheel position and stable ID */
export interface ProcessedPaint extends Paint {
  id: string;
  x: number;
  y: number;
}

/** Group of paints sharing the same hex color (same wheel position) */
export interface PaintGroup {
  key: string;
  paints: ProcessedPaint[];
  rep: ProcessedPaint;
}

/** Color scheme modes for highlighting matching paints */
export type ColorScheme = 'none' | 'complementary' | 'split-complementary' | 'analogous'
