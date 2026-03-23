/**
 * components/DailyBonusModal.tsx
 * ──────────────────────────────────────────────────────────────
 * 毎日ログインボーナスのポップアップ
 * アプリ起動時に初回ログインを検知した場合に表示
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
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

interface DailyBonusModalProps {
  visible: boolean;
  streak: number;
  isStreakBonus: boolean;
  message: string;
  onClose: () => void;
}

export function DailyBonusModal({
  visible,
  streak,
  isStreakBonus,
  message,
  onClose,
}: DailyBonusModalProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const giftScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSequence(
        withSpring(1.1, { damping: 5, stiffness: 280 }),
        withSpring(1.0, { damping: 10 })
      );
      giftScale.value = withSequence(
        withSpring(1.4, { damping: 3, stiffness: 350 }),
        withSpring(1.0, { damping: 8 })
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      scale.value = 0;
      opacity.value = 0;
      giftScale.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const giftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: giftScale.value }],
  }));

  // 連続ログインのドット表示（最大7日）
  const dots = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.overlayBg, overlayStyle]} />
        <Pressable onPress={() => {}}>
          <Animated.View style={[styles.card, cardStyle]}>
            {/* プレゼントアイコン */}
            <Animated.Text style={[styles.gift, giftStyle]}>
              {isStreakBonus ? "🐉" : "🎁"}
            </Animated.Text>

            <Text style={styles.title}>
              {isStreakBonus ? "7日れんぞく！すごい！" : "おはよう！"}
            </Text>

            <Text style={styles.message}>{message}</Text>

            {/* 連続ログインドット */}
            <View style={styles.streakRow}>
              {dots.map((d) => (
                <View
                  key={d}
                  style={[
                    styles.streakDot,
                    d <= streak % 7 || (streak > 0 && streak % 7 === 0 && d <= 7)
                      ? styles.streakDotActive
                      : styles.streakDotInactive,
                  ]}
                >
                  <Text style={styles.streakDotText}>{d}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.streakLabel}>
              {streak}日れんぞく 🔥  あと{7 - (streak % 7 || 7)}日でスペシャルボーナス！
            </Text>

            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="デイリーボーナスを受け取る"
              accessibilityRole="button"
            >
              <Text style={styles.closeBtnText}>うけとる！</Text>
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
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  card: {
    backgroundColor: "#2A1860",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    width: 300,
    borderWidth: 2,
    borderColor: "#C060FF",
    shadowColor: "#C060FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 16,
  },
  gift: {
    fontSize: 64,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFD6EC",
    marginBottom: 8,
    letterSpacing: 1,
  },
  message: {
    fontSize: 14,
    color: "#E8D6FF",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  streakRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  streakDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  streakDotActive: {
    backgroundColor: "#C060FF",
  },
  streakDotInactive: {
    backgroundColor: "rgba(192,96,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(192,96,255,0.4)",
  },
  streakDotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  streakLabel: {
    fontSize: 11,
    color: "#C0A8E0",
    textAlign: "center",
    marginBottom: 20,
  },
  closeBtn: {
    backgroundColor: "#C060FF",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 40,
    shadowColor: "#C060FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});
