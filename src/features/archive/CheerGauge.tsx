import styles from "./cheer-gauge.module.css";

// The rate is withheld until the existing participation threshold is met.
export function CheerGauge({ rate, hidden = false, period = "최근 30일" }: { rate: number | null; hidden?: boolean; period?: string }) {
  const value = rate === null || hidden ? null : Math.min(100, Math.max(0, rate));
  const color = value === null ? "var(--stone)" : `rgb(${Math.round(220 + (37 - 220) * value / 100)}, ${Math.round(53 + (99 - 53) * value / 100)}, ${Math.round(48 + (235 - 48) * value / 100)})`;
  const label = value === null ? (hidden ? "비공개" : "집계 전") : `${value}%`;
  return <span className={styles.gauge} role="img" aria-label={`${period} 응원율 ${label}`}>
    <svg viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r="35" fill="none" stroke={value === 0 ? color : "var(--stone)"} strokeWidth="4" />
      {value !== null && value > 0 && <circle cx="40" cy="40" r="35" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" pathLength="100" strokeDasharray={`${value} 100`} transform="rotate(-90 40 40)" />}
    </svg>
    <span className={styles.reading}><span className={value === null ? styles.pending : styles.value}>{label}</span><span className={styles.label}>응원율</span></span>
  </span>;
}
