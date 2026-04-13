interface SkeletonProps {
  variant: 'card' | 'text' | 'image';
  className?: string;
}

export default function Skeleton({ variant, className = '' }: SkeletonProps) {
  if (variant === 'text') {
    return <div className={`h-4 rounded bg-base-200 animate-pulse ${className}`} />;
  }

  if (variant === 'image') {
    return <div className={`aspect-[3/4] rounded bg-base-200 animate-pulse ${className}`} />;
  }

  return (
    <div className={className}>
      <div className="aspect-[3/4] rounded bg-base-200 animate-pulse" />
      <div className="mt-2.5 space-y-2">
        <div className="h-3 w-16 rounded bg-base-200 animate-pulse" />
        <div className="h-4 w-full rounded bg-base-200 animate-pulse" />
        <div className="h-4 w-20 rounded bg-base-200 animate-pulse" />
      </div>
    </div>
  );
}
