interface BadgeProps {
  variant: 'savings' | 'category' | 'similarity';
  children: React.ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeProps['variant'], string> = {
  savings: 'bg-[var(--color-accent-savings)] text-white text-xs font-semibold px-1.5 py-0.5 rounded',
  category: 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] text-xs font-medium px-3 py-1 rounded-full',
  similarity: 'text-[var(--color-accent-similarity)] text-xs',
};

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`${VARIANT_STYLES[variant]} ${className}`}>
      {children}
    </span>
  );
}
