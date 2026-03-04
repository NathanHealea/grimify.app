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
