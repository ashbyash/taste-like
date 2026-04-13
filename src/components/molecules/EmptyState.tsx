interface EmptyStateProps {
  variant: 'coming-soon' | 'no-results' | 'error';
  message?: string;
  brandLabel?: string;
  className?: string;
}

const DEFAULTS: Record<EmptyStateProps['variant'], string> = {
  'coming-soon': '상품을 준비 중입니다',
  'no-results': '등록된 상품이 없습니다',
  'error': '오류가 발생했습니다',
};

export default function EmptyState({ variant, message, brandLabel, className = '' }: EmptyStateProps) {
  const displayMessage = message ?? (
    variant === 'coming-soon' && brandLabel
      ? `${brandLabel} 상품을 준비 중입니다`
      : DEFAULTS[variant]
  );

  return (
    <div className={`flex flex-col items-center gap-3 py-20 text-center ${className}`}>
      {variant === 'coming-soon' && (
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-text-primary)]/20">
          Coming Soon
        </p>
      )}
      <p className="text-xs text-[var(--color-text-secondary)]">
        {displayMessage}
      </p>
    </div>
  );
}
