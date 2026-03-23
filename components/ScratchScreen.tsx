/**
 * ScratchScreen.tsx
 * ──────────────────────────────────────────────────────────────
 * ScratchCanvas の使用例 & 進捗バー付きの画面サンプル
 * ──────────────────────────────────────────────────────────────
 */

import React, { useCallback } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { ScratchCanvas } from "./ScratchCanvas";
import { useScratchProgress } from "../hooks/useScratchProgress";
import { ItemDef, RARITY_COLOR } from "../constants/items";

// ── シェア対象レアリティ（rare 以上でシェアボタン表示）────────
const SHARE_RARITIES: ItemDef["rarity"][] = ["rare", "epic", "legendary"];

// ── Xシェアテキスト生成 ──────────────────────────────────────
function buildShareText(item: ItemDef, level: number): string {
  if (item.rarity === "legendary") {
    return `🌟 ASMRデコガーデンでレジェンダリーアイテム「${item.emoji}${item.label}」をゲット！✨ 庭レベル${level}に挑戦中🌸 #ASMRデコガーデン #ポケットガーデン`;
  }
  if (item.rarity === "epic") {
    return `💎 ASMRデコガーデンでエピックアイテム「${item.emoji}${item.label}」が出た！✨ 庭レベル${level}🌸 #ASMRデコガーデン #癒しゲーム`;
  }
  // rare
  return `🌈 ASMRデコガーデンでレアアイテム「${item.emoji}${item.label}」ゲット！庭レベル${level}🌸 #ASMRデコガーデン #癒しゲーム`;
}

// ── Xシェアボタン ────────────────────────────────────────────
function XShareButton({ item, level }: { item: ItemDef; level: number }) {
  const rarityColor = RARITY_COLOR[item.rarity];

  const handleShare = useCallback(() => {
    const text = buildShareText(item, level);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      // ブラウザが開けない場合は何もしない
    });
  }, [item, level]);

  return (
    <Pressable
      onPress={handleShare}
      style={[styles.shareBtn, { borderColor: rarityColor + "80" }]}
    >
      <Text style={styles.shareBtnIcon}>𝕏</Text>
      <Text style={styles.shareBtnText}>Xでシェアする</Text>
    </Pressable>
  );
}

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

// ── Props ─────────────────────────────────────────────────────
interface ScratchScreenProps {
  /** スクラッチで引き当てたアイテム（明かされる前は undefined） */
  revealedItem?: ItemDef;
  /** 現在の庭レベル（シェア文言に使用） */
  gardenLevel?: number;
}

// ── メイン画面 ────────────────────────────────────────────────
export function ScratchScreen({ revealedItem, gardenLevel = 1 }: ScratchScreenProps) {
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

  // シェアボタンを出す条件: 解放済み & アイテム情報あり & rare 以上
  const showShareButton =
    isRevealed &&
    revealedItem != null &&
    SHARE_RARITIES.includes(revealedItem.rarity);

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

      {/* Xシェアボタン（rare / epic / legendary 入手時のみ表示）*/}
      {showShareButton && revealedItem && (
        <XShareButton item={revealedItem} level={gardenLevel} />
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

  // ── Xシェアボタン ──────────────────────────────────────────
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#000000",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    // borderColor は rarity カラーで動的指定
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  shareBtnIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
});
