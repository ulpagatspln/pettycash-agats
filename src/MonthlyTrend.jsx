import React, { useEffect, useRef, useState } from 'react';

const HEIGHT = 230;
const PAD = { top: 14, right: 12, bottom: 28, left: 48 };

function niceMax(value) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find(s => s * power >= value);
  return step * power;
}

function compact(value) {
  if (value >= 1e9) return `${+(value / 1e9).toFixed(1)} M`;
  if (value >= 1e6) return `${+(value / 1e6).toFixed(1)} jt`;
  if (value >= 1e3) return `${+(value / 1e3).toFixed(0)} rb`;
  return `${value}`;
}

// Garis pengeluaran per bulan. data: [{ label, fullLabel, value }], value null = bulan belum berjalan.
export default function MonthlyTrend({ data, selectedIndex, formatValue, seriesLabel }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [hoverIndex, setHoverIndex] = useState(null);

  useEffect(() => {
    if (!boxRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  const plotted = data.map((d, i) => ({ ...d, i })).filter(d => d.value !== null);
  const max = niceMax(Math.max(...plotted.map(d => d.value), 0));
  const innerWidth = Math.max(width - PAD.left - PAD.right, 10);
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (i * innerWidth) / (data.length - 1);
  const y = (v) => PAD.top + innerHeight - (v / max) * innerHeight;
  const baseline = y(0);

  let line = '';
  plotted.forEach((d, n) => {
    if (n === 0) { line = `M${x(d.i)} ${y(d.value)}`; return; }
    const prev = plotted[n - 1];
    const midX = (x(prev.i) + x(d.i)) / 2;
    line += ` C${midX} ${y(prev.value)} ${midX} ${y(d.value)} ${x(d.i)} ${y(d.value)}`;
  });
  const area = plotted.length
    ? `${line} L${x(plotted[plotted.length - 1].i)} ${baseline} L${x(plotted[0].i)} ${baseline} Z`
    : '';

  const handlePointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const position = ((e.clientX - rect.left - PAD.left) / innerWidth) * (data.length - 1);
    const index = Math.max(0, Math.min(data.length - 1, Math.round(position)));
    setHoverIndex(data[index].value === null ? null : index);
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const showEveryOther = width < 460;
  const selected = data[selectedIndex]?.value !== null ? selectedIndex : null;

  return (
    <div ref={boxRef} className="relative" style={{ touchAction: 'pan-y' }}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Grafik ${seriesLabel} per bulan`}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
        className="block"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e4f144" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#e4f144" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map(ratio => (
          <g key={ratio}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(max * ratio)} y2={y(max * ratio)} stroke="rgb(255 255 255 / 0.07)" />
            <text x={PAD.left - 10} y={y(max * ratio) + 4} textAnchor="end" fontSize="11" fontWeight="500" fill="#8a8a91">{compact(max * ratio)}</text>
          </g>
        ))}

        {data.map((d, i) => (showEveryOther && i % 2 === 1 ? null : (
          <text key={d.label} x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="11" fontWeight={i === selectedIndex ? 700 : 500} fill={i === selectedIndex ? '#f6f6f4' : '#8a8a91'}>{d.label}</text>
        )))}

        {area && <path d={area} fill="url(#trend-fill)" />}
        {line && <path d={line} fill="none" stroke="#e4f144" strokeWidth="2" strokeLinecap="round" />}

        {selected !== null && (
          <circle cx={x(selected)} cy={y(data[selected].value)} r="5" fill="#e4f144" stroke="#1a1a1d" strokeWidth="2" />
        )}

        {hovered && (
          <g pointerEvents="none">
            <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD.top} y2={baseline} stroke="rgb(255 255 255 / 0.28)" />
            <circle cx={x(hoverIndex)} cy={y(hovered.value)} r="5" fill="#e4f144" stroke="#1a1a1d" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="absolute top-1 pointer-events-none bg-raised border border-line rounded-xl px-3 py-2 shadow-xl"
          style={{ left: Math.min(Math.max(x(hoverIndex) - 80, 0), width - 160), width: 160 }}
        >
          <p className="text-[11px] font-semibold text-muted">{hovered.fullLabel}</p>
          <p className="tabular text-sm font-bold">{formatValue(hovered.value)}</p>
        </div>
      )}
    </div>
  );
}
