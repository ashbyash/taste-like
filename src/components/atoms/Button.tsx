interface ButtonProps {
  variant: 'primary' | 'ghost' | 'pill';
  size?: 'sm' | 'md';
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

const VARIANT_STYLES: Record<ButtonProps['variant'], string> = {
  primary: 'bg-primary text-primary-content font-semibold',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] transition-colors',
  pill: 'rounded-full border text-caption font-medium transition-colors',
};

const SIZE_STYLES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-3.5 text-sm',
};

export default function Button({
  variant,
  size = 'md',
  loading = false,
  disabled = false,
  active = false,
  children,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const pillActive = variant === 'pill'
    ? active
      ? 'border-primary bg-primary text-primary-content'
      : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
    : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${pillActive} ${className}`}
    >
      {loading ? <span className="loading loading-spinner loading-xs" /> : children}
    </button>
  );
}
