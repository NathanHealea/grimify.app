'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { brands } from '@/data/index';
import type { Brand, PaintGroup } from '@/types/paint';
import { COLOR_SEGMENTS, hslToHex, RING_WIDTH, SEGMENT_BOUNDARIES, WHEEL_RADIUS } from '@/utils/colorUtils';

interface ColorWheelProps {
  paintGroups: PaintGroup[];
  brandFilter: Set<string>;
  searchMatchIds: Set<string>;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  selectedGroup: PaintGroup | null;
  hoveredGroup: PaintGroup | null;
  onGroupClick: (group: PaintGroup | null) => void;
  onHoverGroup: (group: PaintGroup | null) => void;
  showBrandRing: boolean;
}

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 8;
const DOT_RADIUS = 5;

function BrandRingArcs({
  group,
  r,
  cx,
  cy,
}: {
  group: PaintGroup
  r: number
  cx: number
  cy: number
}) {
  const uniqueBrands = useMemo(() => {
    const seen = new Map<string, Brand>()
    for (const paint of group.paints) {
      if (!seen.has(paint.brand)) {
        const brand = brands.find((b) => b.id === paint.brand)
        if (brand) seen.set(paint.brand, brand)
      }
    }
    return Array.from(seen.values())
  }, [group.paints])

  const innerR = r + 1
  const outerR = r + 2.5
  const segmentAngle = 360 / uniqueBrands.length

  return (
    <g transform={`translate(${cx}, ${cy})`} pointerEvents='none'>
      {uniqueBrands.map((brand, i) => {
        const startDeg = i * segmentAngle
        const endDeg = startDeg + segmentAngle
        // Full 360° arc is degenerate (start === end point), split into two halves
        if (segmentAngle === 360) {
          return (
            <g key={brand.id}>
              <path
                d={buildHueRingPath(0, 180, innerR, outerR)}
                fill={brand.color}
                stroke='rgba(0,0,0,0.3)'
                strokeWidth={0.5}
              />
              <path
                d={buildHueRingPath(180, 360 - 0.01, innerR, outerR)}
                fill={brand.color}
                stroke='rgba(0,0,0,0.3)'
                strokeWidth={0.5}
              />
            </g>
          )
        }
        return (
          <path
            key={brand.id}
            d={buildHueRingPath(startDeg, endDeg, innerR, outerR)}
            fill={brand.color}
            stroke='rgba(0,0,0,0.3)'
            strokeWidth={0.5}
          />
        )
      })}
    </g>
  )
}

function PaintDot({
  group,
  isSelected,
  showBrandRing,
  dimmed,
  searchHighlight,
  onHover,
  onClick,
}: {
  group: PaintGroup
  isSelected: boolean
  showBrandRing: boolean
  dimmed: boolean
  searchHighlight: boolean
  onHover: (group: PaintGroup | null) => void
  onClick: (group: PaintGroup) => void
}) {
  const { rep } = group
  const isMulti = group.paints.length > 1
  const r = isMulti ? DOT_RADIUS + 2 : DOT_RADIUS

  return (
    <g opacity={dimmed ? 0.15 : 1}>
      {searchHighlight && !dimmed && (
        <circle
          cx={rep.x}
          cy={rep.y}
          r={r + 3}
          fill='none'
          stroke='#facc15'
          strokeWidth={2}
          filter='url(#search-glow)'
          pointerEvents='none'
        />
      )}
      {isSelected && (
        <circle
          cx={rep.x}
          cy={rep.y}
          r={showBrandRing ? r + 4 : r + 2.5}
          fill='none'
          stroke='white'
          strokeWidth={2}
          strokeDasharray='4,2'
          pointerEvents='none'
        />
      )}
      {showBrandRing && (
        <BrandRingArcs group={group} r={r} cx={rep.x} cy={rep.y} />
      )}
      <circle
        cx={rep.x}
        cy={rep.y}
        r={r}
        fill={rep.hex}
        stroke='rgba(0,0,0,0.5)'
        strokeWidth={1}
        className='cursor-pointer'
        onPointerEnter={() => onHover(group)}
        onPointerLeave={() => onHover(null)}
        onClick={() => onClick(group)}
      />
      {isMulti && (
        <>
          <circle
            cx={rep.x + r * 0.7}
            cy={rep.y - r * 0.7}
            r={4}
            fill='#f0c040'
            stroke='#000'
            strokeWidth={0.5}
            pointerEvents='none'
          />
          <text
            x={rep.x + r * 0.7}
            y={rep.y - r * 0.7 + 0.5}
            textAnchor='middle'
            dominantBaseline='middle'
            fill='#000'
            fontSize={5}
            fontWeight={800}
            pointerEvents='none'>
            {group.paints.length}
          </text>
        </>
      )}
    </g>
  )
}

function buildHueRingPath(startDeg: number, endDeg: number, innerR: number, outerR: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const s1 = toRad(startDeg);
  const s2 = toRad(endDeg);
  // SVG y-axis is flipped, so negate sin for counter-clockwise hue mapping
  const x1 = outerR * Math.cos(s1);
  const y1 = -outerR * Math.sin(s1);
  const x2 = outerR * Math.cos(s2);
  const y2 = -outerR * Math.sin(s2);
  const x3 = innerR * Math.cos(s2);
  const y3 = -innerR * Math.sin(s2);
  const x4 = innerR * Math.cos(s1);
  const y4 = -innerR * Math.sin(s1);

  return `M ${x1} ${y1} A ${outerR} ${outerR} 0 0 0 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 0 1 ${x4} ${y4} Z`;
}

export default function ColorWheel({
  paintGroups,
  brandFilter,
  searchMatchIds,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  selectedGroup,
  hoveredGroup,
  onGroupClick,
  onHoverGroup,
  showBrandRing,
}: ColorWheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const touchStart = useRef<{ dist: number; zoom: number; mid: { x: number; y: number } } | null>(null);
  const dragDistance = useRef(0);

  // ViewBox derived from zoom and pan
  const totalSize = (WHEEL_RADIUS + RING_WIDTH + 40) * 2;
  const viewSize = totalSize / zoom;
  const viewBox = `${-viewSize / 2 + pan.x} ${-viewSize / 2 + pan.y} ${viewSize} ${viewSize}`;

  // Hue ring arcs (one per degree for smooth gradient)
  const hueRingArcs = useMemo(() => {
    const arcs = [];
    const innerR = WHEEL_RADIUS;
    const outerR = WHEEL_RADIUS + RING_WIDTH;
    for (let deg = 0; deg < 360; deg++) {
      const color = hslToHex(deg, 1, 0.5);
      arcs.push(<path key={deg} d={buildHueRingPath(deg, deg + 1.5, innerR, outerR)} fill={color} stroke='none' />);
    }
    return arcs;
  }, []);

  // Segment background wedges — light (inner) → normal (mid) → dark (outer)
  const segmentWedges = useMemo(() => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const opacity = 0.1;
    // Three concentric bands per segment
    const bands: { innerR: number; outerR: number; lightness: number }[] = [
      { innerR: 0, outerR: WHEEL_RADIUS / 3, lightness: 0.75 },
      { innerR: WHEEL_RADIUS / 3, outerR: (WHEEL_RADIUS * 2) / 3, lightness: 0.5 },
      { innerR: (WHEEL_RADIUS * 2) / 3, outerR: WHEEL_RADIUS, lightness: 0.25 },
    ];
    return COLOR_SEGMENTS.flatMap((seg) => {
      const start = seg.hueStart;
      const end = seg.hueEnd < seg.hueStart ? seg.hueEnd + 360 : seg.hueEnd;
      const startRad = toRad(start);
      const endRad = toRad(end);
      const largeArc = end - start > 180 ? 1 : 0;

      return bands.map((band, bi) => {
        const color = hslToHex(seg.midAngle, 1, band.lightness);
        if (band.innerR === 0) {
          // Innermost band: pie slice from center
          const x1 = band.outerR * Math.cos(startRad);
          const y1 = -band.outerR * Math.sin(startRad);
          const x2 = band.outerR * Math.cos(endRad);
          const y2 = -band.outerR * Math.sin(endRad);
          const d = `M 0 0 L ${x1} ${y1} A ${band.outerR} ${band.outerR} 0 ${largeArc} 0 ${x2} ${y2} Z`;
          return <path key={`${seg.name}-${bi}`} d={d} fill={color} fillOpacity={opacity} stroke='none' />;
        }
        // Ring band: annular wedge
        const d = buildHueRingPath(start, end, band.innerR, band.outerR);
        return <path key={`${seg.name}-${bi}`} d={d} fill={color} fillOpacity={opacity} stroke='none' />;
      });
    });
  }, []);

  // Segment divider lines
  const dividerLines = useMemo(
    () =>
      SEGMENT_BOUNDARIES.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const outerR = WHEEL_RADIUS + RING_WIDTH;
        return (
          <line
            key={angle}
            x1={0}
            y1={0}
            x2={outerR * Math.cos(rad)}
            y2={-outerR * Math.sin(rad)}
            stroke='rgba(255,255,255,0.3)'
            strokeWidth={1}
          />
        );
      }),
    [],
  );

  // Segment labels — horizontal, colored to match their section, scale with zoom
  const labelFontSize = 14;
  const segmentLabels = useMemo(
    () =>
      COLOR_SEGMENTS.map((seg) => {
        const rad = (seg.midAngle * Math.PI) / 180;
        const labelR = WHEEL_RADIUS + RING_WIDTH + 20;
        const x = labelR * Math.cos(rad);
        const y = -labelR * Math.sin(rad);
        const color = hslToHex(seg.midAngle, 1, 0.5);
        return (
          <text
            key={seg.name}
            x={x}
            y={y}
            fill={color}
            fillOpacity={0.7}
            fontSize={labelFontSize}
            fontWeight={600}
            textAnchor='middle'
            dominantBaseline='central'>
            {seg.name}
          </text>
        );
      }),
    [labelFontSize],
  );

  // Convert client coordinates to SVG coordinates
  const clientToSvg = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      return {
        x: -viewSize / 2 + pan.x + nx * viewSize,
        y: -viewSize / 2 + pan.y + ny * viewSize,
      };
    },
    [viewSize, pan],
  );

  // Mouse wheel zoom (toward cursor)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomFactor));
      const svgPoint = clientToSvg(e.clientX, e.clientY);

      // Adjust pan so the point under cursor stays fixed
      const ratio = zoom / newZoom;
      const newPanX = svgPoint.x - (svgPoint.x - pan.x) * ratio;
      const newPanY = svgPoint.y - (svgPoint.y - pan.y) * ratio;

      onZoomChange(newZoom);
      onPanChange({ x: newPanX, y: newPanY });
    },
    [zoom, pan, clientToSvg, onZoomChange, onPanChange],
  );

  // Mouse drag pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsDragging(true);
      dragDistance.current = 0;
      dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      dragDistance.current = Math.sqrt(dx * dx + dy * dy);
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      // Convert pixel delta to SVG units
      const scale = viewSize / rect.width;
      onPanChange({
        x: dragStart.current.panX - dx * scale,
        y: dragStart.current.panY - dy * scale,
      });
    },
    [isDragging, viewSize, onPanChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  // Touch handlers
  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single finger — pan
        setIsDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, panX: pan.x, panY: pan.y };
      } else if (e.touches.length === 2) {
        // Two fingers — pinch zoom
        const dist = getTouchDist(e.touches);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        touchStart.current = { dist, zoom, mid: { x: midX, y: midY } };
        setIsDragging(false);
        dragStart.current = null;
      }
    },
    [pan, zoom],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging && dragStart.current) {
        // Pan
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const scale = viewSize / rect.width;
        onPanChange({
          x: dragStart.current.panX - dx * scale,
          y: dragStart.current.panY - dy * scale,
        });
      } else if (e.touches.length === 2 && touchStart.current) {
        // Pinch zoom
        const dist = getTouchDist(e.touches);
        const ratio = dist / touchStart.current.dist;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, touchStart.current.zoom * ratio));

        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const svgPoint = clientToSvg(midX, midY);
        const zoomRatio = zoom / newZoom;
        const newPanX = svgPoint.x - (svgPoint.x - pan.x) * zoomRatio;
        const newPanY = svgPoint.y - (svgPoint.y - pan.y) * zoomRatio;

        onZoomChange(newZoom);
        onPanChange({ x: newPanX, y: newPanY });
      }
    },
    [isDragging, viewSize, zoom, pan, clientToSvg, onZoomChange, onPanChange],
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
    touchStart.current = null;
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className='h-full w-full'
      style={{
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      <defs>
        <filter id='search-glow' x='-50%' y='-50%' width='200%' height='200%'>
          <feGaussianBlur in='SourceGraphic' stdDeviation='2' result='blur' />
          <feMerge>
            <feMergeNode in='blur' />
            <feMergeNode in='SourceGraphic' />
          </feMerge>
        </filter>
      </defs>

      {/* Segment background wedges */}
      <g>{segmentWedges}</g>

      {/* Hue ring */}
      <g>{hueRingArcs}</g>

      {/* Segment dividers */}
      <g>{dividerLines}</g>

      {/* Segment labels */}
      <g>{segmentLabels}</g>

      {/* Paint dots (one per group) */}
      <g>
        {paintGroups.map((group) => {
          const matchesBrand = brandFilter.size === 0 || group.paints.some((p) => brandFilter.has(p.brand))
          const matchesSearch = searchMatchIds.size === 0 || group.paints.some((p) => searchMatchIds.has(p.id))
          const dimmed = !matchesBrand || !matchesSearch
          return (
            <PaintDot
              key={group.key}
              group={group}
              isSelected={selectedGroup?.key === group.key}
              showBrandRing={showBrandRing}
              dimmed={dimmed}
              searchHighlight={searchMatchIds.size > 0 && matchesSearch}
              onHover={onHoverGroup}
              onClick={(g) => {
                if (dragDistance.current > 3) return
                onGroupClick(g)
              }}
            />
          )
        })}
      </g>

      {/* Labels layer — rendered on top of all dots */}
      <g pointerEvents='none'>
        {paintGroups
          .filter((g) => hoveredGroup?.key === g.key || selectedGroup?.key === g.key)
          .map((group) => {
            const { rep } = group
            const isMulti = group.paints.length > 1
            const r = isMulti ? DOT_RADIUS + 2 : DOT_RADIUS
            const label1 = isMulti ? `${group.paints.length} paints` : rep.name
            const label2 = isMulti ? rep.hex.toUpperCase() : rep.brand
            const maxLen = Math.max(label1.length, label2.length)
            const boxW = maxLen * 3 + 4
            const boxH = 16
            const boxX = rep.x - boxW / 2
            const boxY = rep.y + r
            return (
              <g key={`label-${group.key}`}>
                <rect
                  x={boxX}
                  y={boxY}
                  width={boxW}
                  height={boxH}
                  rx={3}
                  ry={3}
                  fill='rgba(0,0,0,0.7)'
                />
                <text
                  x={rep.x}
                  y={rep.y + r + 6}
                  textAnchor='middle'
                  fill='#bbb'
                  fontSize={5}
                  fontWeight={600}>
                  {label1}
                </text>
                <text
                  x={rep.x}
                  y={rep.y + r + 13}
                  textAnchor='middle'
                  fill={isMulti ? '#f0c040' : '#888'}
                  fontSize={4}>
                  {label2}
                </text>
              </g>
            )
          })}
      </g>
    </svg>
  );
}
