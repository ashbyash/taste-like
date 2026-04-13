import Image from 'next/image';

interface ProductImageProps {
  src: string;
  alt: string;
  aspect?: '3/4' | '1/1' | '4/3';
  radius?: 'sm' | 'none';
  width?: number;
  height?: number;
  className?: string;
}

const ASPECT_MAP = {
  '3/4': 'aspect-[3/4]',
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
};

export default function ProductImage({
  src,
  alt,
  aspect = '3/4',
  radius = 'sm',
  width = 360,
  height = 480,
  className = '',
}: ProductImageProps) {
  return (
    <figure className={`${ASPECT_MAP[aspect]} overflow-hidden ${radius === 'sm' ? 'rounded' : ''} ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </figure>
  );
}
