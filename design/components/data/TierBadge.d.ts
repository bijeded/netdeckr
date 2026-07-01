export interface TierBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** explicit tier label */
  tier?: 'T1' | 'T2' | 'T3' | 'Otros';
  /** metagame share % — auto-classifies when `tier` omitted */
  pct?: number;
}
export function TierBadge(props: TierBadgeProps): JSX.Element;
/** Classify a % share into a tier label. */
export function tierFor(pct: number): 'T1' | 'T2' | 'T3' | 'Otros';
