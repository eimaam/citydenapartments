import { useState } from 'react';
import { generateAvatarMeta } from '../../utils/avatar';
import { cn } from '../../lib/utils';

type IProps = {
  name: string;
  imageUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md';
};

const sizeMap = {
  sm: 'size-8 min-h-8 min-w-8 text-xs',
  md: 'size-9 min-h-9 min-w-9 text-sm',
} as const;

/**
 * Renders a profile image when `imageUrl` loads; otherwise initials from `generateAvatarMeta`.
 */
export const UserAvatar = ({ name, imageUrl, className, size = 'md' }: IProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const showPhoto = Boolean(imageUrl?.trim()) && !imageFailed;
  const meta = generateAvatarMeta(name);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-full border border-outline-variant/80',
        sizeMap[size],
        className,
      )}
    >
      {showPhoto && imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
          decoding="async"
        />
      ) : (
        <span
          className="flex size-full min-h-0 min-w-0 items-center justify-center font-semibold leading-none"
          style={{ backgroundColor: meta.backgroundColor, color: meta.textColor }}
          aria-hidden
        >
          {meta.initials}
        </span>
      )}
    </span>
  );
};
