/**
 * components/LevelUpModal.tsx
 * ──────────────────────────────────────────────────────────────
 * レベルアップ演出モーダル
 * ガーデンにアイテムを配置してレベルアップした際に表示
 * ──────────────────────────────────────────────────────────────
 */

import React, { useEffect } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface LevelUpModalProps {
  visible: boolean;
  level: number;
  message: string;
  onClose: () => void;
}

export function LevelUpModal({ visible, level, message, onClose }: LevelUpModalProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const starScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // ドーン！と出てくるアニメーション
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withSpring(1.15, { damping: 4, stiffness: 300 }),
        withSpring(1.0, { damping: 10, stiffness: 200 })
      );
      starScale.value = withDelay(
        300,
        withSequence(
          withSpring(1.3, { damping: 3, stiffness: 400 }),
          withSpring(1.0, { damping: 8 })
        )
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      scale.value = 0;
      opacity.value = 0;
      starScale.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBg, overlayStyle]} />
        <Pressable onPress={() => {}}>
          <Animated.View style={[styles.card, cardStyle]}>
            <Animated.Text style={[styles.star, starStyle]}>⭐</Animated.Text>
            <Text style={styles.levelUpText}>LEVEL UP!</Text>
            <Text style={styles.levelText}>Lv {level}</Text>
            <Text style={styles.message}>{message}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>やったー！</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayBg: {
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  card: {
    backgroundColor: "#2A1860",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: 280,
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },
  star: {
    fontSize: 56,
    marginBottom: 8,
  },
  levelUpText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFD700",
    letterSpacing: 4,
    marginBottom: 4,
  },
  levelText: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 16,
    lineHeight: 56,
  },
  message: {
    fontSize: 15,
    color: "#E8D6FF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  closeBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1030",
  },
});
