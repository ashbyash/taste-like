import Input from '@/components/atoms/Input';
import Button from '@/components/atoms/Button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  loading = false,
  placeholder = '럭셔리 브랜드 상품 URL을 붙여넣으세요',
  className = '',
}: SearchBarProps) {
  return (
    <div className={className}>
      <form onSubmit={onSubmit}>
        <div className="flex overflow-hidden rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-page)] transition-colors focus-within:border-[var(--color-text-secondary)]">
          <label htmlFor="url-input" className="sr-only">상품 URL</label>
          <Input
            id="url-input"
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={loading}
            className="flex-1 px-4 py-3.5"
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            disabled={!value.trim()}
            className="shrink-0 rounded-none"
          >
            찾기
          </Button>
        </div>
      </form>
      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
        또는 아래에서 상품을 직접 탐색하세요
      </p>
    </div>
  );
}
