import React, {useEffect, useMemo, useRef} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const {width: SCREEN_W, height: SCREEN_H} = Dimensions.get('window');

const COLORS = {
  bg: '#F0F8FC',
  trading: '#0B3C57',
  journal: '#12A7DE',
  candle: '#0A8FCB',
  candleLight: '#6FCBEE',
  wick: '#8FD6EE',
  line: '#BEE7F7',
  lineSoft: '#DCF2FB',
};

const BOTTOM_CANDLES = [
  {h: 28, light: true},
  {h: 48, light: true},
  {h: 32, light: true},
  {h: 40, light: true},
  {h: 34, light: true},
  {h: 52, light: true},
  {h: 58, light: false},
  {h: 36, light: false},
  {h: 62, light: false},
  {h: 44, light: false},
  {h: 68, light: false},
  {h: 54, light: false},
  {h: 42, light: false},
  {h: 66, light: false},
  {h: 58, light: false},
  {h: 40, light: false},
  {h: 72, light: false},
  {h: 64, light: false},
  {h: 56, light: false},
  {h: 78, light: false},
];

/** Professional splash — title + rising chart (no center icon). */
export function SplashScreen() {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const tradingOpacity = useRef(new Animated.Value(0)).current;
  const tradingY = useRef(new Animated.Value(22)).current;
  const journalOpacity = useRef(new Animated.Value(0)).current;
  const journalY = useRef(new Animated.Value(22)).current;
  const dividerScale = useRef(new Animated.Value(0)).current;
  const chartOpacity = useRef(new Animated.Value(0)).current;
  const chartY = useRef(new Animated.Value(48)).current;
  const candleProgress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(110, [
        Animated.parallel([
          Animated.timing(tradingOpacity, {
            toValue: 1,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(tradingY, {
            toValue: 0,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(journalOpacity, {
            toValue: 1,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(journalY, {
            toValue: 0,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(dividerScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(chartOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(chartY, {
          toValue: 0,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(candleProgress, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [
    bgOpacity,
    tradingOpacity,
    tradingY,
    journalOpacity,
    journalY,
    dividerScale,
    chartOpacity,
    chartY,
    candleProgress,
    pulse,
  ]);

  const titlePulse = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  const candleGap = useMemo(() => {
    const count = BOTTOM_CANDLES.length;
    return Math.max(3, (SCREEN_W - 40) / count - 15);
  }, []);

  return (
    <Animated.View style={[styles.screen, {opacity: bgOpacity}]}>
      <View style={styles.waveTop} pointerEvents="none" />

      <Animated.View
        style={[
          styles.titleBlock,
          {transform: [{scale: titlePulse}]},
        ]}>
        <Animated.Text
          style={[
            styles.trading,
            {
              opacity: tradingOpacity,
              transform: [{translateY: tradingY}],
            },
          ]}>
          Trading
        </Animated.Text>
        <Animated.Text
          style={[
            styles.journal,
            {
              opacity: journalOpacity,
              transform: [{translateY: journalY}],
            },
          ]}>
          Journal
        </Animated.Text>
        <Animated.View
          style={[
            styles.divider,
            {transform: [{scaleX: dividerScale}]},
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.chartWrap,
          {
            opacity: chartOpacity,
            transform: [{translateY: chartY}],
          },
        ]}
        pointerEvents="none">
        <View style={styles.waveLineA} />
        <View style={styles.waveLineB} />
        <View style={styles.candleRow}>
          {BOTTOM_CANDLES.map((c, i) => {
            const start = i / BOTTOM_CANDLES.length;
            const end = Math.min(1, (i + 1.15) / BOTTOM_CANDLES.length);
            const rise = candleProgress.interpolate({
              inputRange: [start, end],
              outputRange: [28, 0],
              extrapolate: 'clamp',
            });
            const opacity = candleProgress.interpolate({
              inputRange: [start, end],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.candleCol,
                  {
                    marginHorizontal: candleGap / 2,
                    opacity,
                    transform: [{translateY: rise}],
                  },
                ]}>
                <View
                  style={[
                    styles.wick,
                    {height: c.h + 16, backgroundColor: COLORS.wick},
                  ]}
                />
                <View
                  style={[
                    styles.candle,
                    {
                      height: c.h,
                      backgroundColor: c.light
                        ? COLORS.candleLight
                        : COLORS.candle,
                    },
                  ]}
                />
              </Animated.View>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveTop: {
    position: 'absolute',
    top: SCREEN_H * 0.14,
    left: -40,
    right: -40,
    height: 3,
    backgroundColor: COLORS.lineSoft,
    borderRadius: 2,
    transform: [{rotate: '-4deg'}],
    opacity: 0.85,
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: SCREEN_H * 0.1,
  },
  trading: {
    fontSize: Math.min(52, SCREEN_W * 0.12),
    fontWeight: '800',
    color: COLORS.trading,
    letterSpacing: 0.4,
  },
  journal: {
    fontSize: Math.min(52, SCREEN_W * 0.12),
    fontWeight: '800',
    color: COLORS.journal,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  divider: {
    marginTop: 18,
    width: 64,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.journal,
    opacity: 0.55,
  },
  chartWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_H * 0.3,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  waveLineA: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: 118,
    height: 3,
    backgroundColor: COLORS.line,
    borderRadius: 2,
    transform: [{rotate: '-6deg'}],
    opacity: 0.85,
  },
  waveLineB: {
    position: 'absolute',
    left: -20,
    right: -20,
    bottom: 78,
    height: 3,
    backgroundColor: COLORS.lineSoft,
    borderRadius: 2,
    transform: [{rotate: '-4deg'}],
    opacity: 0.9,
  },
  candleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 110,
  },
  candleCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 15,
  },
  wick: {
    width: 3,
    borderRadius: 2,
    marginBottom: -4,
  },
  candle: {
    width: 13,
    borderRadius: 3,
  },
});
