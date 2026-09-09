import React, {useMemo, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import {TradeImage} from './TradeImage';
import {toDisplayImageUri} from '../services/tradeImages';
import {radius, spacing, useThemedStyles} from '../theme';

type Props = {
  images: string[];
  /** Thumbnail style for each image */
  imageStyle?: StyleProp<ViewStyle>;
  /** Wrap style for the row */
  style?: StyleProp<ViewStyle>;
  /** Remove callback (edit form) — tap × or long-press */
  onRemove?: (uri: string) => void;
  /** Extra node in the thumbnail row (e.g. add button) */
  trailing?: React.ReactNode;
};

/**
 * Screenshot thumbnails — tap to open full-screen viewer with pinch zoom
 * and swipe between images.
 */
export function ScreenshotGallery({
  images,
  imageStyle,
  style,
  onRemove,
  trailing,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const styles = useThemedStyles(({colors, typography}) =>
    StyleSheet.create({
      row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
      },
      thumbWrap: {
        position: 'relative',
        width: 96,
        height: 96,
        borderRadius: radius.sm,
        overflow: 'hidden',
      },
      thumbFill: {
        width: '100%',
        height: '100%',
      },
      zoomHint: {
        position: 'absolute',
        right: 4,
        bottom: 4,
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
      },
      zoomHintText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
      },
      removeBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
      },
      removeBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 16,
      },
      header: {
        paddingTop: 52,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      },
      headerText: {
        ...typography.caption,
        color: '#fff',
      },
      close: {
        ...typography.body,
        color: colors.accent,
        fontWeight: '700',
      },
      deleteHeader: {
        ...typography.body,
        color: colors.loss,
        fontWeight: '700',
      },
    }),
  );

  const viewerImages = useMemo(
    () =>
      images.filter(Boolean).map(uri => ({uri: toDisplayImageUri(uri)})),
    [images],
  );

  if (images.length === 0 && !trailing) {
    return null;
  }

  return (
    <View style={style}>
      <View style={styles.row}>
        {images.map((uri, i) => (
          <View key={`${uri}-${i}`} style={[styles.thumbWrap, imageStyle]}>
            <Pressable
              onPress={() => {
                setIndex(i);
                setVisible(true);
              }}
              onLongPress={onRemove ? () => onRemove(uri) : undefined}
              style={styles.thumbFill}>
              <TradeImage uri={uri} style={[styles.thumbFill, imageStyle]} />
              <View style={styles.zoomHint} pointerEvents="none">
                <Text style={styles.zoomHintText}>View</Text>
              </View>
            </Pressable>
            {onRemove ? (
              <Pressable
                onPress={() => onRemove(uri)}
                style={styles.removeBtn}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel="Delete image">
                <Text style={styles.removeBtnText}>×</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        {trailing}
      </View>

      {viewerImages.length > 0 ? (
        <ImageViewing
          images={viewerImages}
          imageIndex={index}
          visible={visible}
          onRequestClose={() => setVisible(false)}
          swipeToCloseEnabled
          doubleTapToZoomEnabled
          presentationStyle="overFullScreen"
          backgroundColor="#000"
          HeaderComponent={({imageIndex}) => (
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {imageIndex + 1} / {viewerImages.length}
              </Text>
              <View style={{flexDirection: 'row', gap: spacing.lg}}>
                {onRemove ? (
                  <Pressable
                    onPress={() => {
                      const target = images[imageIndex];
                      if (!target) {
                        return;
                      }
                      onRemove(target);
                      if (images.length <= 1) {
                        setVisible(false);
                      } else {
                        setIndex(Math.min(imageIndex, images.length - 2));
                      }
                    }}
                    hitSlop={12}>
                    <Text style={styles.deleteHeader}>Delete</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setVisible(false)} hitSlop={12}>
                  <Text style={styles.close}>Close</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}
