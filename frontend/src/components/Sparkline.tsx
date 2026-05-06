interface SparklineProps {
  values: number[];
  line: number;
  w?: number;
  h?: number;
}

export default function Sparkline({ values, line, w = 92, h = 28 }: SparklineProps) {
  if (!values.length) return null;
  const max = Math.max(...values, line) * 1.1 || 1;
  const min = 0;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  const y = (v: number) => h - ((v - min) / (max - min)) * h;
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${y(v)}`)
    .join(" ");
  const lineY = y(line);
  return (
    <svg width={w} height={h} className="sparkline">
      <line x1="0" y1={lineY} x2={w} y2={lineY} className="spark-line-ref" strokeDasharray="2 3" />
      <path d={path} className="spark-path" />
      {values.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={y(v)}
          r={3}
          className={v > line ? "spark-hit" : "spark-miss"}
        />
      ))}
    </svg>
  );
}
