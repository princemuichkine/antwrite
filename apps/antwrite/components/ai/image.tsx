import { cn } from '@/lib/utils';
import type { Experimental_GeneratedImage } from 'ai';
import NextImage from 'next/image';

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
  mediaType?: string;
};

export const Image = ({
  base64,
  uint8Array,
  mediaType,
  ...props
}: ImageProps) => (
  <div className="relative">
    <NextImage
      alt={props.alt || ''}
      className={cn(
        'h-auto max-w-full overflow-hidden rounded-sm',
        props.className,
      )}
      src={`data:${mediaType};base64,${base64}`}
      fill
      style={{ objectFit: 'contain' }}
    />
  </div>
);
