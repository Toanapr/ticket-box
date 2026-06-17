export function MockQr({ payload, className = "" }: { payload: string; className?: string }): React.ReactElement {
  const seed = Array.from(payload).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const cells = Array.from({ length: 64 }, (_, index) => ((seed + index * 17 + Math.floor(index / 3)) % 5) < 2);

  return (
    <svg className={className} viewBox="0 0 100 100" role="img" aria-label="Mock QR code">
      <rect width="100" height="100" fill="white" />
      <Finder x={8} y={8} />
      <Finder x={67} y={8} />
      <Finder x={8} y={67} />
      {cells.map((active, index) => {
        if (!active) return null;
        const x = 38 + (index % 8) * 6;
        const y = 38 + Math.floor(index / 8) * 6;
        if (x > 88 || y > 88) return null;
        return <rect key={index} x={x} y={y} width="4" height="4" fill="black" />;
      })}
      <rect x="46" y="46" width="8" height="8" fill="#00b159" />
    </svg>
  );
}

function Finder({ x, y }: { x: number; y: number }): React.ReactElement {
  return (
    <>
      <rect x={x} y={y} width="25" height="25" fill="black" />
      <rect x={x + 5} y={y + 5} width="15" height="15" fill="white" />
      <rect x={x + 9} y={y + 9} width="7" height="7" fill="black" />
    </>
  );
}
