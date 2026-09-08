import React, {useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {radius, useThemedStyles} from '../theme';
import {toDisplayImageUri} from '../services/tradeImages';

type Props = {
  uri: string;
  style?: object;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
};

/** Loads a persisted trade screenshot; shows a placeholder if the file is gone. */
export function TradeImage({uri, style, resizeMode = 'cover'}: Props) {
  const [failed, setFailed] = useState(false);
  const sourceUri = toDisplayImageUri(uri);
  const styles = useThemedStyles(({colors}) =>
    StyleSheet.create({
      fallback: {
        backgroundColor: colors.surfaceElevated,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      },
      fallbackText: {
        color: colors.textDim,
        fontSize: 10,
      },
    }),
  );

  if (!uri || failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>No image</Text>
      </View>
    );
  }

  return (
    <Image
      source={{uri: sourceUri}}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
