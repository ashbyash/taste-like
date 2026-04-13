import type { Category } from '@/types/brand';
import CategoryPill from '@/components/molecules/CategoryPill';

interface CategoryFilterProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

const UI_CATEGORIES: { key: Category; label: string }[] = [
  { key: 'outerwear', label: '아우터' },
  { key: 'tops', label: '상의' },
  { key: 'bottoms', label: '하의' },
  { key: 'bags', label: '가방' },
  { key: 'shoes', label: '신발' },
];

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto scrollbar-hide sm:flex-wrap sm:justify-center">
      {UI_CATEGORIES.map(({ key, label }) => (
        <CategoryPill
          key={key}
          label={label}
          active={selected === key}
          onClick={() => onSelect(key)}
        />
      ))}
    </div>
  );
}
