import type { ReactNode } from 'react';

interface TypographyProps {
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  variant: 'display' | 'heading' | 'body' | 'caption' | 'label';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  align?: 'left' | 'center';
  truncate?: boolean | number;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<TypographyProps['variant'], string> = {
  display: 'text-display',
  heading: 'text-heading',
  body: 'text-body',
  caption: 'text-caption',
  label: 'text-label tracking-wider',
};

const COLOR_CLASSES: Record<NonNullable<TypographyProps['color']>, string> = {
  primary: 'text-[var(--color-text-primary)]',
  secondary: 'text-[var(--color-text-secondary)]',
  muted: 'text-[var(--color-text-muted)]',
  accent: 'text-[var(--color-accent-savings)]',
};

const DEFAULT_TAG: Record<TypographyProps['variant'], TypographyProps['as']> = {
  display: 'h1',
  heading: 'h2',
  body: 'p',
  caption: 'p',
  label: 'span',
};

export default function Typography({
  as,
  variant,
  color = 'primary',
  align = 'left',
  truncate,
  children,
  className = '',
}: TypographyProps) {
  const Tag = as ?? DEFAULT_TAG[variant] ?? 'p';

  const truncateClass = truncate === true
    ? 'truncate'
    : typeof truncate === 'number'
      ? `line-clamp-${truncate}`
      : '';

  const alignClass = align === 'center' ? 'text-center' : '';

  return (
    <Tag className={`${VARIANT_CLASSES[variant]} ${COLOR_CLASSES[color]} ${alignClass} ${truncateClass} ${className}`}>
      {children}
    </Tag>
  );
}
