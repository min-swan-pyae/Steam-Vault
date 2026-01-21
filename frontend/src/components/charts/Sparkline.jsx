import React from 'react';

const Sparkline = React.memo(({ data = [], width = 120, height = 36, className = '' }) => {
  if (!data || data.length === 0) return null;
  // map Steam history data: [timestamp, price, volume]
  const points = data.map(([ts, price]) => ({ x: new Date(ts).getTime(), y: parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0 }));
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scaleX = (x) => (x - minX) / (maxX - minX || 1) * width;
  const scaleY = (y) => height - ((y - minY) / (maxY - minY || 1) * height);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x).toFixed(1)} ${scaleY(p.y).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className={className}>
      <path d={d} fill="none" stroke="#22c55e" strokeWidth="2" />
    </svg>
  );
}, (prevProps, nextProps) => {
  // Deep comparison for data array
  return prevProps.width === nextProps.width &&
         prevProps.height === nextProps.height &&
         prevProps.className === nextProps.className &&
         JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
});

Sparkline.displayName = 'Sparkline';

export default Sparkline;
