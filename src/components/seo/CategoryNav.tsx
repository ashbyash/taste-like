import Link from 'next/link';
import { SEO_CATEGORIES, getCategoryLabelKo } from '@/lib/seo/config';

interface Props {
  comboSlug: string;
  activeCategory?: string;
}

export default function CategoryNav({ comboSlug, activeCategory }: Props) {
  const basePath = `/style/${comboSlug}`;

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      <Link
        href={basePath}
        className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
          !activeCategory
            ? 'border-primary bg-primary text-primary-content'
            : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
        }`}
      >
        전체
      </Link>
      {SEO_CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`${basePath}/${cat}`}
          className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
            activeCategory === cat
              ? 'border-primary bg-primary text-primary-content'
              : 'border-base-300 text-info hover:border-secondary hover:text-base-content'
          }`}
        >
          {getCategoryLabelKo(cat)}
        </Link>
      ))}
    </nav>
  );
}
