export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: string;
  /** value color, e.g. var(--neon-text) or var(--up) */
  color?: string;
}
export function StatCard(props: StatCardProps): JSX.Element;
