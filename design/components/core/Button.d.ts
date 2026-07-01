import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** neon = glowing gradient CTA; ghost = bordered neutral */
  variant?: 'neon' | 'ghost';
  size?: 'sm' | 'md';
  /** leading glyph (unicode/emoji char or node) */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
}
export function IconButton(props: IconButtonProps): JSX.Element;
