/**
 * CollectionScreen.tsx
 * ──────────────────────────────────────────────────────────────
 * アイテム収集画面
 *
 * フロー:
 *  1. ScratchCanvas でスクラッチ → 80% 到達でアイテム出現
 *  2. アイテムをタップで収集（expo-av 音源 + ImpactMedium）
 *  3. 収集後「つぎのスクラッチ」ボタンでリセット
 *
 * 依存:
 *   expo-av           (効果音)
 *   expo-haptics      (タップ振動)
 *   react-native-reanimated (収集アニメーション)
 * ──────────────────────────────────────────────────────────────
 */

import React, { useCallback, useState } from "react";
import {
  Dimensions,
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
import { Audio } from "expo-av";

import { ScratchCanvas } from "./ScratchCanvas";
import { useScratchProgress } from "../hooks/useScratchProgress";
import { drawRandomItem, ItemDef, RARITY_COLOR } from "../constants/items";

const { width: W } = Dimensions.get("window");

// ──────────────────────────────────────────────────────────────
// 音源マップ（require は静的解析のため事前定義必須）
// ──────────────────────────────────────────────────────────────
const SOUND_MAP: Record<string, number> = {
  "collect_common.wav":    require("../assets/sounds/collect_common.wav"),
  "collect_rare.wav":      require("../assets/sounds/collect_rare.wav"),
  "collect_epic.wav":      require("../assets/sounds/collect_epic.wav"),
  "collect_legendary.wav": require("../assets/sounds/collect_legendary.wav"),
  "reveal.wav":            require("../assets/sounds/reveal.wav"),
};

const soundCache: Partial<Record<string, Audio.Sound>> = {};

async function playSound(filename: string) {
  try {
    const source = SOUND_MAP[filename];
    if (!source) return;
    if (!soundCache[filename]) {
      const { sound } = await Audio.Sound.createAsync(source);
      soundCache[filename] = sound;
    }
    await soundCache[filename]!.replayAsync();
  } catch {
    // 音源ファイルが無くても落ちないよう握りつぶす
  }
}

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface CollectionScreenProps {
  /** アイテムを収集したときのコールバック */
  onCollect: (item: ItemDef) => void;
}

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────
export function CollectionScreen({ onCollect }: CollectionScreenProps) {
  // 現在のスクラッチセッションで出現するアイテム
  const [pendingItem, setPendingItem] = useState<ItemDef | null>(null);
  const [collected, setCollected] = useState(false);
  const [scratchKey, setScratchKey] = useState(0); // key でリセット

  // アイテム出現アニメーション
  const itemScale = useSharedValue(0);
  const itemOpacity = useSharedValue(0);

  // 収集後の飛び込みアニメーション
  const collectY = useSharedValue(0);
  const collectOpacity = useSharedValue(1);

  // ─────────────────────────────────
  // 80% 達成 → アイテム抽選・表示
  // ─────────────────────────────────
  const handleThresholdReached = useCallback(() => {
    const item = drawRandomItem();
    setPendingItem(item);
    setCollected(false);

    // 「シャリーン」系効果音
    playSound("reveal.mp3");

    // ポップイン
    itemScale.value = withSequence(
      withSpring(1.15, { damping: 4, stiffness: 400 }),
      withSpring(1.0, { damping: 10, stiffness: 200 })
    );
    itemOpacity.value = withTiming(1, { duration: 200 });
  }, [itemScale, itemOpacity]);

  // ─────────────────────────────────
  // アイテムタップ → 収集
  // ─────────────────────────────────
  const handleCollectTap = useCallback(() => {
    if (!pendingItem || collected) return;

    setCollected(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    playSound(pendingItem.sound);

    // アイテムが上に飛んでいくアニメーション
    collectY.value = withTiming(-120, { duration: 500 });
    collectOpacity.value = withDelay(200, withTiming(0, { duration: 300 }));

    // 500ms 後にコールバック
    setTimeout(() => {
      onCollect(pendingItem);
    }, 500);
  }, [pendingItem, collected, collectY, collectOpacity, onCollect]);

  // ─────────────────────────────────
  // 次のスクラッチへ
  // ─────────────────────────────────
  const handleNext = useCallback(() => {
    setPendingItem(null);
    setCollected(false);
    collectY.value = 0;
    collectOpacity.value = 1;
    itemScale.value = 0;
    itemOpacity.value = 0;
    setScratchKey((k) => k + 1);
  }, [collectY, collectOpacity, itemScale, itemOpacity]);

  // Scratch progress hook
  const { bounceScale, onProgress, isRevealed } = useScratchProgress({
    onThresholdReached: handleThresholdReached,
  });

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  const itemStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: itemScale.value },
      { translateY: collectY.value },
    ],
    opacity: itemOpacity.value * collectOpacity.value,
  }));

  return (
    <View style={styles.root}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>✨ スクラッチ ✨</Text>
        <Text style={styles.headerSub}>こすってたからものをみつけよう</Text>
      </View>

      {/* スクラッチキャンバス */}
      <Animated.View style={bounceStyle}>
        <ScratchCanvas
          key={scratchKey}
          onProgress={onProgress}
          onRevealed={() => {}}
        />
      </Animated.View>

      {/* 出現アイテム */}
      {pendingItem && (
        <Pressable onPress={handleCollectTap} style={styles.itemArea}>
          <Animated.View style={[styles.itemCard, itemStyle]}>
            {/* レアリティグロー */}
            <View
              style={[
                styles.rarityGlow,
                { backgroundColor: RARITY_COLOR[pendingItem.rarity] },
              ]}
            />
            <Text style={styles.itemEmoji}>{pendingItem.emoji}</Text>
            <Text style={styles.itemLabel}>{pendingItem.label}</Text>
            <View
              style={[
                styles.rarityBadge,
                { backgroundColor: RARITY_COLOR[pendingItem.rarity] },
              ]}
            >
              <Text style={styles.rarityText}>
                {pendingItem.rarity.toUpperCase()}
              </Text>
            </View>

            {collected ? (
              <Text style={styles.collectDone}>✓ GET！</Text>
            ) : (
              <Text style={styles.collectHint}>タップして しゅうしゅう！</Text>
            )}
          </Animated.View>
        </Pressable>
      )}

      {/* 次のスクラッチボタン */}
      {collected && (
        <Pressable
          style={styles.nextButton}
          onPress={handleNext}
          android_ripple={{ color: "#FF80C0" }}
        >
          <Text style={styles.nextButtonText}>✨ つぎのスクラッチへ</Text>
        </Pressable>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A1030",
    alignItems: "center",
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFD6EC",
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 13,
    color: "#C0A8E0",
    marginTop: 4,
  },
  itemArea: {
    marginTop: 20,
    alignItems: "center",
  },
  itemCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderWidth: 1.5,
    borderColor: "rgba(255,214,236,0.3)",
    overflow: "hidden",
  },
  rarityGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
  },
  itemEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  itemLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  rarityBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginBottom: 12,
  },
  rarityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
  collectHint: {
    fontSize: 14,
    color: "#FFD6EC",
    opacity: 0.9,
  },
  collectDone: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD6EC",
  },
  nextButton: {
    marginTop: 24,
    backgroundColor: "#C060FF",
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: "#C060FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
});
