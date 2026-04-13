interface GenderTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function GenderTab({ label, active, onClick }: GenderTabProps) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-1 py-1.5 text-sm transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]/60'
      }`}
    >
      {label}
    </button>
  );
}
