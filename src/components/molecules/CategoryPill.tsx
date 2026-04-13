interface CategoryPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function CategoryPill({ label, active, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-content'
          : 'border-[var(--color-border-default)] text-[var(--color-text-muted)] hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
      }`}
    >
      {label}
    </button>
  );
}
