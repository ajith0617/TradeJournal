import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';
import {motion} from '../animation/tokens';

type Props = {
  children: React.ReactNode;
  /** Re-run pop when this identity changes */
  trigger: string | number;
  style?: StyleProp<ViewStyle>;
};

/** Soft scale pop — for hero metrics when values refresh. */
export function ScalePop({children, trigger, style}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(0.96);
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [scale, trigger]);

  return (
    <Animated.View style={[{transform: [{scale}]}, style]}>
      {children}
    </Animated.View>
  );
}

type PulseBorderProps = {
  children: React.ReactNode;
  active: boolean;
  color: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
};

/** Soft contextual glow ring (native-driver opacity). */
export function PulseGlow({
  children,
  active,
  color,
  style,
  radius = 16,
}: PulseBorderProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: motion.easing.soft,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const opacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.35],
  });

  return (
    <Animated.View style={[{overflow: 'hidden', borderRadius: radius}, style]}>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              borderWidth: 1.5,
              borderColor: color,
              opacity,
            },
          ]}
        />
      ) : null}
      {children}
    </Animated.View>
  );
}
