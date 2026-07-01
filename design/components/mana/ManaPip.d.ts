import React from 'react';

export interface ManaPipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** WUBRG color letter */
  color?: 'W' | 'U' | 'B' | 'R' | 'G';
  /** diameter in px */
  size?: number;
}
export function ManaPip(props: ManaPipProps): JSX.Element;

export interface ManaPipsProps {
  /** color-identity string, e.g. "UR", "WUBRG" */
  colors?: string;
  size?: number;
  gap?: number;
  style?: React.CSSProperties;
}
export function ManaPips(props: ManaPipsProps): JSX.Element;
