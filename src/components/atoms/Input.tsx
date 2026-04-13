interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  disabled?: boolean;
  type?: 'text' | 'url';
  id?: string;
  className?: string;
}

export default function Input({
  placeholder,
  value,
  onChange,
  onSubmit,
  disabled = false,
  type = 'text',
  id,
  className = '',
}: InputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
      disabled={disabled}
      placeholder={placeholder}
      className={`bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-primary)]/30 focus:outline-none ${className}`}
    />
  );
}
