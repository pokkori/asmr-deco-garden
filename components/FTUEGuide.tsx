/**
 * FTUEGuide.tsx
 * ──────────────────────────────────────────────────────────────
 * 初回チュートリアルガイド
 *
 * - 初回起動時のみ表示
 * - 指アイコンがぐるぐる動いてスクラッチを誘導
 * - タップで閉じる
 * ──────────────────────────────────────────────────────────────
 */

import React, { useEffect } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

interface FTUEGuideProps {
  visible: boolean;
  onDismiss: () => void;
}

export function FTUEGuide({ visible, onDismiss }: FTUEGuideProps) {
  // 指の X 軌跡（右下方向にスワイプ）
  const fingerX = useSharedValue(W * 0.25);
  const fingerY = useSharedValue(H * 0.35);
  const fingerScale = useSharedValue(1);
  const fingerOpacity = useSharedValue(0);

  // フェードイン
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    // フェードイン
    overlayOpacity.value = withTiming(1, { duration: 400 });

    // 指フェードイン → スワイプ → フェードアウト → リセット を繰り返す
    fingerOpacity.value = withDelay(
      600,
      withRepeat(
        withSequence(
          // 現れる
          withTiming(1, { duration: 300 }),
          // 待機
          withTiming(1, { duration: 200 }),
          // 消える
          withTiming(0, { duration: 300 }),
          // 非表示のまま待機
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      )
    );

    // 指の移動（右下方向へスワイプ）
    fingerX.value = W * 0.25;
    fingerY.value = H * 0.38;
    fingerX.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(W * 0.65, {
            duration: 900,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(W * 0.25, { duration: 0 })
        ),
        -1,
        false
      )
    );
    fingerY.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(H * 0.52, {
            duration: 900,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
          withTiming(H * 0.38, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // タップ時の凹みアニメーション
    fingerScale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 150 }),
          withTiming(1.0, { duration: 150 }),
          withTiming(1.0, { duration: 900 })
        ),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(fingerX);
      cancelAnimation(fingerY);
      cancelAnimation(fingerOpacity);
      cancelAnimation(fingerScale);
      cancelAnimation(overlayOpacity);
    };
  }, [visible]);

  const fingerStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: fingerX.value,
    top: fingerY.value,
    opacity: fingerOpacity.value,
    transform: [{ scale: fingerScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Pressable style={styles.root} onPress={onDismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
          {/* 上部テキスト */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>✨ こすってひらこう ✨</Text>
            <Text style={styles.subtitle}>
              画面をなぞると{"\n"}かくされたたからものがでてくるよ！
            </Text>
          </View>

          {/* 指アイコン */}
          <Animated.View style={fingerStyle} pointerEvents="none">
            <Text style={styles.fingerEmoji}>👆</Text>
            {/* スワイプ軌跡のグロー */}
            <View style={styles.glowTrail} />
          </Animated.View>

          {/* 下部ヒント */}
          <View style={styles.bottomHint}>
            <Text style={styles.hintText}>タップでとばす</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    backgroundColor: "rgba(30, 20, 50, 0.78)",
    alignItems: "center",
  },
  textContainer: {
    marginTop: H * 0.12,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFD6EC",
    textAlign: "center",
    letterSpacing: 1,
    marginBottom: 12,
    // Text shadow for sparkle effect
    textShadowColor: "#FF80C0",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 17,
    color: "#E8D6FF",
    textAlign: "center",
    lineHeight: 26,
  },
  fingerEmoji: {
    fontSize: 52,
  },
  glowTrail: {
    position: "absolute",
    bottom: -4,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFD6EC",
    opacity: 0.5,
  },
  bottomHint: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
  },
  hintText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
  },
});
