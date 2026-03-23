/**
 * components/CollectionBook.tsx
 * ──────────────────────────────────────────────────────────────
 * コレクション図鑑画面
 *
 * - 全アイテムをグリッド表示
 * - 未収集はシルエット（???）で表示
 * - 収集済みは光って表示
 * - セットコレクションの進捗も表示
 * - 「あと○種類でコンプリート！」と表示
 * ──────────────────────────────────────────────────────────────
 */

import React, { useMemo } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

import {
  ITEMS,
  ItemDef,
  ITEM_SETS,
  RARITY_COLOR,
  getSetProgress,
} from "../constants/items";

const { width: W } = Dimensions.get("window");
const COLS = 4;
const CELL_SIZE = (W - 32 - (COLS - 1) * 8) / COLS;

// ──────────────────────────────────────────────────────────────
// アイテム1マス
// ──────────────────────────────────────────────────────────────
function ItemCell({
  item,
  collected,
}: {
  item: ItemDef;
  collected: boolean;
}) {
  // 収集済みアイテムのグロー点滅
  const glowOpacity = useSharedValue(collected ? 0.3 : 0);
  if (collected) {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1200 }),
        withTiming(0.2, { duration: 1200 })
      ),
      -1,
      true
    );
  }

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const rarityColor = RARITY_COLOR[item.rarity];

  return (
    <View
      style={[
        styles.cell,
        collected && styles.cellCollected,
        collected && { borderColor: rarityColor + "80" },
      ]}
    >
      {collected && (
        <Animated.View
          style={[
            styles.cellGlow,
            { backgroundColor: rarityColor },
            glowStyle,
          ]}
        />
      )}

      {collected ? (
        <>
          <Text style={styles.cellEmoji}>{item.emoji}</Text>
          <Text style={styles.cellLabel}>{item.label}</Text>
          <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
        </>
      ) : (
        <>
          <Text style={styles.cellUnknownEmoji}>？</Text>
          <Text style={styles.cellUnknownLabel}>???</Text>
        </>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// セット進捗バー
// ──────────────────────────────────────────────────────────────
function SetProgressBar({
  set,
  collectedIds,
}: {
  set: (typeof ITEM_SETS)[0];
  collectedIds: Set<string>;
}) {
  const { done, total } = getSetProgress(set, [...collectedIds]);
  const ratio = done / total;
  const isComplete = done === total;

  return (
    <View style={styles.setRow}>
      <Text style={styles.setEmoji}>{set.emoji}</Text>
      <View style={styles.setInfo}>
        <View style={styles.setNameRow}>
          <Text style={styles.setName}>{set.name}</Text>
          {isComplete && <Text style={styles.setComplete}>✅ かんせい！</Text>}
        </View>
        <View style={styles.setBarBg}>
          <View style={[styles.setBarFill, { width: `${ratio * 100}%` }]} />
        </View>
        <Text style={styles.setCount}>
          {done} / {total}
          {isComplete ? "  🏆" : `  あと${total - done}こ`}
        </Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────
interface CollectionBookProps {
  /** 収集済みアイテムのリスト（重複あり・インベントリ + 配置済み）  */
  collectedItems: ItemDef[];
}

export function CollectionBook({ collectedItems }: CollectionBookProps) {
  // 一度でも収集したことのある種類IDセット
  const collectedIds = useMemo(() => {
    const ids = new Set<string>();
    collectedItems.forEach((i) => ids.add(i.id));
    return ids;
  }, [collectedItems]);

  const totalKinds = ITEMS.length;
  const collectedKinds = ITEMS.filter((i) => collectedIds.has(i.id)).length;
  const remaining = totalKinds - collectedKinds;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>📖 ずかん</Text>
        <Text style={styles.subtitle}>
          {collectedKinds} / {totalKinds} しゅるい しゅうしゅう
        </Text>
        {remaining > 0 ? (
          <Text style={styles.remainingText}>
            あと{remaining}しゅるいでコンプリート！
          </Text>
        ) : (
          <Text style={styles.completeText}>🎊 ぜんぶ あつめた！すごい！</Text>
        )}
      </View>

      {/* アイテムグリッド */}
      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <ItemCell
            key={item.id}
            item={item}
            collected={collectedIds.has(item.id)}
          />
        ))}
      </View>

      {/* セットコレクション */}
      <View style={styles.setsSection}>
        <Text style={styles.setsTitle}>🌟 セットコレクション</Text>
        {ITEM_SETS.map((set) => (
          <SetProgressBar key={set.id} set={set} collectedIds={collectedIds} />
        ))}
      </View>

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A1030",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ヘッダー
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFD6EC",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 15,
    color: "#C0A8E0",
    marginTop: 6,
    fontWeight: "600",
  },
  remainingText: {
    fontSize: 13,
    color: "#C060FF",
    marginTop: 4,
    fontWeight: "500",
  },
  completeText: {
    fontSize: 16,
    color: "#FFD700",
    marginTop: 6,
    fontWeight: "700",
  },

  // グリッド
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(200,160,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  cellCollected: {
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1.5,
  },
  cellGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  cellEmoji: {
    fontSize: CELL_SIZE * 0.45,
    textAlign: "center",
  },
  cellLabel: {
    fontSize: 10,
    color: "#E8D6FF",
    textAlign: "center",
    marginTop: 2,
    fontWeight: "600",
  },
  rarityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  cellUnknownEmoji: {
    fontSize: CELL_SIZE * 0.4,
    color: "rgba(200,160,255,0.25)",
    textAlign: "center",
  },
  cellUnknownLabel: {
    fontSize: 10,
    color: "rgba(200,160,255,0.25)",
    textAlign: "center",
    marginTop: 2,
  },

  // セットコレクション
  setsSection: {
    marginBottom: 16,
  },
  setsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFD6EC",
    marginBottom: 12,
    letterSpacing: 1,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(200,160,255,0.15)",
  },
  setEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  setInfo: {
    flex: 1,
  },
  setNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  setName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E8D6FF",
  },
  setComplete: {
    fontSize: 12,
    color: "#FFD700",
    fontWeight: "600",
  },
  setBarBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  setBarFill: {
    height: "100%",
    backgroundColor: "#C060FF",
    borderRadius: 3,
  },
  setCount: {
    fontSize: 11,
    color: "#C0A8E0",
  },

  bottomPad: {
    height: 24,
  },
});
