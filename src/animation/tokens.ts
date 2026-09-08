import {Easing} from 'react-native';

/** Shared motion tokens — keep animations consistent and restrained. */
export const motion = {
  duration: {
    fast: 180,
    slow: 420,
    enter: 360,
  },
  easing: {
    emphasize: Easing.bezier(0.2, 0, 0, 1),
    soft: Easing.out(Easing.cubic),
  },
  distance: {
    sm: 8,
    md: 14,
  },
} as const;
