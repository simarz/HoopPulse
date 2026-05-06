interface HitDotsProps {
  values: number[];
  line: number;
}

export default function HitDots({ values, line }: HitDotsProps) {
  return (
    <span className="hit-dots">
      {values.map((v, i) => (
        <span
          key={i}
          className={`hit-dot ${v > line ? "hit" : "miss"}`}
          title={`${v} (line ${line})`}
        />
      ))}
    </span>
  );
}
