export interface IAvatarMeta {
  initials: string;
  backgroundColor: string;
  textColor: string;
}

const AVATAR_PALETTE: IAvatarMeta['backgroundColor'][] = [
  '#3B82F6',
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EF4444',
];

/**
 * Deterministic initials + colors for placeholder avatars when no photo URL is available.
 */
export const generateAvatarMeta = (name: string): IAvatarMeta => {
  const trimmed = name.trim();
  let initials = '?';

  if (trimmed.length > 0) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      const a = parts[0][0];
      const b = parts[1][0];
      initials = `${a ?? ''}${b ?? ''}`.toUpperCase() || '?';
    } else {
      const w = parts[0] ?? trimmed;
      if (w.length >= 2) {
        initials = `${w[0]}${w[1]}`.toUpperCase();
      } else {
        initials = w[0]?.toUpperCase() ?? '?';
      }
    }
  }

  const hash = trimmed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const colorIndex = Math.abs(hash) % AVATAR_PALETTE.length;
  const backgroundColor = AVATAR_PALETTE[colorIndex] ?? AVATAR_PALETTE[0];

  return {
    initials,
    backgroundColor,
    textColor: '#FFFFFF',
  };
};
