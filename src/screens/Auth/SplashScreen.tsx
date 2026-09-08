import React, {useEffect, useRef} from 'react';
import {Animated, Image, StyleSheet, View} from 'react-native';

const splash = require('../../assets/brand_logo.png');

/** Full-bleed branded splash while the app hydrates / boots. */
export function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={styles.screen}>
      <Animated.View style={[styles.fill, {opacity}]}>
        <Image source={splash} style={styles.image} resizeMode="cover" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#043321',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
