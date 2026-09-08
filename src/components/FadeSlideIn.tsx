import React, {useEffect, useRef} from 'react';
import {Animated, type StyleProp, type ViewStyle} from 'react-native';
import {motion} from '../animation/tokens';

type Props = {
  children: React.ReactNode;
  /** Stagger delay in ms */
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** Remount / re-run when this changes */
  trigger?: string | number | boolean;
  distance?: number;
};

/** Fade + slight upward slide — for section entrances. */
export function FadeSlideIn({
  children,
  delay = 0,
  style,
  trigger = 0,
  distance = motion.distance.md,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(distance);
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: motion.duration.enter,
        delay,
        easing: motion.easing.soft,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: motion.duration.enter,
        delay,
        easing: motion.easing.emphasize,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, distance, opacity, translateY, trigger]);

  return (
    <Animated.View style={[{opacity, transform: [{translateY}]}, style]}>
      {children}
    </Animated.View>
  );
}
