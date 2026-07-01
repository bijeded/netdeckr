export interface ArchetypeCardProps {
  rank: number;
  name: string;
  /** WUBRG color identity, e.g. "UR" */
  colors?: string;
  /** metagame share % */
  pct?: number;
  /** week-over-week delta (pp) */
  delta?: number;
  /** hue (0-360) for the placeholder art gradient */
  hue?: number;
  /** top archetype's pct, so bars scale relative to the leader */
  maxPct?: number;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function ArchetypeCard(props: ArchetypeCardProps): JSX.Element;
