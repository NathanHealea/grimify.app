export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert hue (degrees) and lightness (0-1) to SVG x,y on the wheel */
export function paintToWheelPosition(h: number, l: number, wheelRadius: number): { x: number; y: number } {
  // Lightness maps to radius: l=1 (white) at center, l=0 (black) at edge
  const radius = wheelRadius * (1 - l);
  // Hue maps to angle: 0° = right (3 o'clock), counter-clockwise
  const angleRad = (h * Math.PI) / 180;
  return {
    x: radius * Math.cos(angleRad),
    y: -radius * Math.sin(angleRad), // negative because SVG y-axis is flipped
  };
}

export interface ColorSegment {
  name: string;
  hueStart: number;
  hueEnd: number;
  midAngle: number;
}

export const COLOR_SEGMENTS: ColorSegment[] = [
  { name: 'Red', hueStart: 330, hueEnd: 30, midAngle: 0 },
  { name: 'Yellow', hueStart: 30, hueEnd: 90, midAngle: 60 },
  { name: 'Green', hueStart: 90, hueEnd: 150, midAngle: 120 },
  { name: 'Cyan', hueStart: 150, hueEnd: 210, midAngle: 180 },
  { name: 'Blue', hueStart: 210, hueEnd: 270, midAngle: 240 },
  { name: 'Magenta', hueStart: 270, hueEnd: 330, midAngle: 300 },
];

/** Segment boundary angles (where divider lines go) */
export const SEGMENT_BOUNDARIES = [30, 90, 150, 210, 270, 330];

export const WHEEL_RADIUS = 400;
export const RING_WIDTH = 20;

/** Shortest angular distance between two hues (0–180°) */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(h1 - h2);
  return d > 180 ? 360 - d : d;
}

/** Filter paints matching the given color scheme relative to a reference hue */
export function getSchemeMatches(referenceHue: number, allPaints: { hex: string }[], scheme: string): boolean[] {
  if (scheme === 'none') return allPaints.map(() => false);

  return allPaints.map((paint) => {
    const hsl = hexToHsl(paint.hex);
    const dist = hueDistance(referenceHue, hsl.h);
    switch (scheme) {
      case 'complementary':
        return dist > 155;
      case 'split-complementary':
        return dist >= 120 && dist <= 180;
      case 'analogous':
        return dist < 45;
      default:
        return false;
    }
  });
}

/** Get angular wedge ranges for a scheme overlay on the wheel */
export function getSchemeWedges(hue: number, scheme: string): { startDeg: number; endDeg: number }[] {
  const norm = (deg: number) => ((deg % 360) + 360) % 360;

  switch (scheme) {
    case 'complementary':
      return [{ startDeg: norm(hue + 155), endDeg: norm(hue - 155) }];
    case 'split-complementary':
      return [
        { startDeg: norm(hue + 120), endDeg: norm(hue + 180) },
        { startDeg: norm(hue - 180), endDeg: norm(hue - 120) },
      ];
    case 'analogous':
      return [{ startDeg: norm(hue - 45), endDeg: norm(hue + 45) }];
    default:
      return [];
  }
}
