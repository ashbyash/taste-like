import type { Gender } from '@/types/brand';
import GenderTab from '@/components/molecules/GenderTab';

interface GenderToggleProps {
  selected: Gender;
  onSelect: (gender: Gender) => void;
}

const OPTIONS: { key: Gender; label: string }[] = [
  { key: 'women', label: '여성' },
  { key: 'men', label: '남성' },
];

export default function GenderToggle({ selected, onSelect }: GenderToggleProps) {
  return (
    <div className="flex justify-center gap-6">
      {OPTIONS.map(({ key, label }) => (
        <GenderTab
          key={key}
          label={label}
          active={selected === key}
          onClick={() => onSelect(key)}
        />
      ))}
    </div>
  );
}
