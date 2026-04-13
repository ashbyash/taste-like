interface BrandTabProps {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function BrandTab({ label, active, disabled = false, onClick }: BrandTabProps) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      className={[
        'shrink-0 pb-3 text-xs font-semibold uppercase tracking-widest',
        'transition-colors duration-150 border-b-2 -mb-px',
        active
          ? 'border-primary text-primary'
          : disabled
            ? 'border-transparent text-[var(--color-text-primary)]/20 cursor-not-allowed'
            : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
