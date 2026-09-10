import React, {useMemo, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import {TradeImage} from './TradeImage';
import {toDisplayImageUri} from '../services/tradeImages';
import {radius, spacing, useThemedStyles} from '../theme';

const COLUMNS = 3;
const GAP = spacing.md;

type Props = {
  images: string[];
  /** Extra style merged onto each thumb (avoid fixed width/height — gallery sizes for 3-up) */
  imageStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Remove callback — delete only from fullscreen viewer */
  onRemove?: (uri: string) => void;
  /** Extra node in the grid (e.g. add button) — sized to match thumbs */
  trailing?: React.ReactNode;
};

/**
 * Screenshot grid — 3 per row, then wraps. Tap opens full-screen viewer.
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
  const [rowWidth, setRowWidth] = useState(0);

  const cellSize =
    rowWidth > 0 ? Math.floor((rowWidth - GAP * (COLUMNS - 1)) / COLUMNS) : 0;

  const styles = useThemedStyles(({colors: c, typography}) =>
    StyleSheet.create({
      grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GAP,
      },
      cell: {
        position: 'relative',
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: c.surfaceElevated,
        borderWidth: 1,
        borderColor: c.border,
      },
      thumbFill: {
        width: '100%',
        height: '100%',
      },
      indexBadge: {
        position: 'absolute',
        top: 6,
        left: 6,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
      },
      indexBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
      },
      zoomHint: {
        position: 'absolute',
        right: 6,
        bottom: 6,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
      },
      zoomHintText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
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
        color: c.accent,
        fontWeight: '700',
      },
      deleteHeader: {
        ...typography.body,
        color: c.loss,
        fontWeight: '700',
      },
    }),
  );

  const viewerImages = useMemo(
    () =>
      images.filter(Boolean).map(uri => ({uri: toDisplayImageUri(uri)})),
    [images],
  );

  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - rowWidth) > 1) {
      setRowWidth(w);
    }
  };

  if (images.length === 0 && !trailing) {
    return null;
  }

  const sizedTrailing =
    trailing && cellSize > 0 && React.isValidElement(trailing)
      ? React.cloneElement(
          trailing as React.ReactElement<{style?: StyleProp<ViewStyle>}>,
          {
            style: [
              (trailing as React.ReactElement<{style?: StyleProp<ViewStyle>}>)
                .props.style,
              {
                width: cellSize,
                height: cellSize,
                borderRadius: radius.md,
              },
            ],
          },
        )
      : trailing;

  return (
    <View style={style} onLayout={onGridLayout}>
      <View style={styles.grid}>
        {cellSize > 0
          ? images.map((uri, i) => (
              <Pressable
                key={`${uri}-${i}`}
                onPress={() => {
                  setIndex(i);
                  setVisible(true);
                }}
                style={[
                  styles.cell,
                  {width: cellSize, height: cellSize},
                  imageStyle,
                ]}>
                <TradeImage uri={uri} style={styles.thumbFill} />
                <View style={styles.indexBadge} pointerEvents="none">
                  <Text style={styles.indexBadgeText}>{i + 1}</Text>
                </View>
                <View style={styles.zoomHint} pointerEvents="none">
                  <Text style={styles.zoomHintText}>View</Text>
                </View>
              </Pressable>
            ))
          : null}
        {sizedTrailing}
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
