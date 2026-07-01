export interface ChangeIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** delta in percentage points; sign drives color/icon */
  delta?: number;
}
export function ChangeIndicator(props: ChangeIndicatorProps): JSX.Element;
