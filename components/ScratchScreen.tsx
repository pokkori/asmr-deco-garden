/**
 * ScratchScreen.tsx
 * ──────────────────────────────────────────────────────────────
 * ScratchCanvas の使用例 & 進捗バー付きの画面サンプル
 * ──────────────────────────────────────────────────────────────
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { ScratchCanvas } from "./ScratchCanvas";
import { useScratchProgress } from "../hooks/useScratchProgress";

// ── キラキラアイテム例（🌟 を中央に大きく表示）──────────────
function StarPrize() {
  return (
    <View style={prize.container}>
      <Text style={prize.star}>🌟</Text>
      <Text style={prize.label}>レアアイテム発見！</Text>
    </View>
  );
}

const prize = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0FA",
  },
  star: { fontSize: 96 },
  label: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#C060A0",
    marginTop: 8,
    letterSpacing: 2,
  },
});

// ── メイン画面 ────────────────────────────────────────────────
export function ScratchScreen() {
  const { progress, isRevealed, bounceScale, onProgress, reset } =
    useScratchProgress({
      threshold: 0.8,
      onThresholdReached: () => console.log("✨ アイテム解放！"),
    });

  // プログレスバーのアニメーション幅
  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress * 100)}%` as unknown as number,
  }));

  // 「ぷにっ」ボタンアニメーション
  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bounceScale.value }],
  }));

  return (
    <View style={styles.screen}>
      {/* タイトル */}
      <Text style={styles.title}>✨ こすって みつけよう</Text>

      {/* メインキャンバス */}
      <Animated.View style={bounceStyle}>
        <ScratchCanvas
          prizeContent={<StarPrize />}
          onProgress={onProgress}
          onRevealed={() => console.log("全消去完了！")}
        />
      </Animated.View>

      {/* 進捗バー */}
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>

      {/* 状態メッセージ（テキスト最小化・絵文字主体）*/}
      {isRevealed ? (
        <Text style={styles.revealText}>🎉 シャリーン！</Text>
      ) : (
        <Text style={styles.hint}>
          {progress < 0.3 ? "👆 こすってね" : progress < 0.7 ? "✨ いいかんじ！" : "💫 もうすこし！"}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F0FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#9040C0",
    letterSpacing: 1,
  },
  barTrack: {
    width: "90%",
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E0C8F0",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#C060E0",
  },
  revealText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FF60B0",
  },
  hint: {
    fontSize: 16,
    color: "#9060C0",
    fontWeight: "600",
  },
});
