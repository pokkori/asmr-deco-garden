/**
 * DecoGardenScreen.tsx
 * ──────────────────────────────────────────────────────────────
 * デコレーションガーデン画面
 *
 * - インベントリ（収集済み）からアイテムをドラッグ → ガーデンに配置
 * - 配置済みアイテムもドラッグで移動可能
 * - 長押し → 削除確認
 * - 境界ガードレール（guardBounds）で画面外に出ない
 *
 * 依存:
 *   react-native-gesture-handler ^2.x
 *   react-native-reanimated ^3.x
 * ──────────────────────────────────────────────────────────────
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  LayoutRectangle,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useDecoGarden, PlacedItem } from "../hooks/useDecoGarden";
import { ItemDef, ITEMS, RARITY_COLOR } from "../constants/items";
import { LevelUpModal } from "./LevelUpModal";
import { useGardenLevel } from "../hooks/useGardenLevel";

const { width: W } = Dimensions.get("window");
const INVENTORY_HEIGHT = 120;

// 美しさスコアのレアリティ係数
const RARITY_SCORE: Record<string, number> = {
  common: 1,
  rare: 3,
  epic: 6,
  legendary: 12,
};
const MAX_SCORE_PER_STAR = 10; // 10点 = ★1

// ──────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────
interface DecoGardenScreenProps {
  inventory: ItemDef[];
  onCollectMore: () => void;
  /** ガーデン配置でインベントリから消費した時のコールバック */
  onItemCollected: (item: ItemDef) => void;
  /** レベルアップ時にボーナス回数を親に通知 */
  onBonusGranted?: () => void;
}

// ──────────────────────────────────────────────────────────────
// 配置済みアイテム 1個のドラッグ可能コンポーネント
// ──────────────────────────────────────────────────────────────
function DraggablePlaced({
  item,
  gardenW,
  gardenH,
  onMove,
  onBringFront,
  onRemove,
}: {
  item: PlacedItem;
  gardenW: number;
  gardenH: number;
  onMove: (uid: string, x: number, y: number, gW: number, gH: number) => void;
  onBringFront: (uid: string) => void;
  onRemove: (uid: string) => void;
}) {
  const startX = useSharedValue(item.x);
  const startY = useSharedValue(item.y);
  const offsetX = useSharedValue(item.x);
  const offsetY = useSharedValue(item.y);
  const scale = useSharedValue(1);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 外部 x/y 変更を反映
  React.useEffect(() => {
    offsetX.value = item.x;
    offsetY.value = item.y;
  }, [item.x, item.y]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      scale.value = withSpring(1.12, { damping: 6, stiffness: 300 });
      runOnJS(onBringFront)(item.uid);
    })
    .onUpdate((e) => {
      offsetX.value = startX.value + e.translationX;
      offsetY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      scale.value = withSpring(1.0, { damping: 8, stiffness: 200 });
      runOnJS(onMove)(item.uid, offsetX.value, offsetY.value, gardenW, gardenH);
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
      runOnJS(setConfirmDelete)(true);
    });

  const composed = Gesture.Simultaneous(panGesture, longPressGesture);

  const animStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: offsetX.value,
    top: offsetY.value,
    zIndex: item.zIndex,
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <GestureDetector gesture={composed}>
        <Animated.View style={[animStyle, { width: item.size, height: item.size }]}>
          <Text style={{ fontSize: item.size * 0.8, textAlign: "center" }}>
            {item.emoji}
          </Text>
        </Animated.View>
      </GestureDetector>

      {/* 削除確認モーダル */}
      {confirmDelete && (
        <View style={styles.deleteModal}>
          <Text style={styles.deleteTitle}>🗑️ このアイテムを{"\n"}はずしますか？</Text>
          <View style={styles.deleteButtons}>
            <Pressable
              style={[styles.deleteBtn, styles.deleteBtnCancel]}
              onPress={() => setConfirmDelete(false)}
              accessibilityLabel="キャンセル：アイテムをはずすのをやめる"
              accessibilityRole="button"
            >
              <Text style={styles.deleteBtnText}>やめる</Text>
            </Pressable>
            <Pressable
              style={[styles.deleteBtn, styles.deleteBtnConfirm]}
              onPress={() => {
                setConfirmDelete(false);
                onRemove(item.uid);
              }}
              accessibilityLabel={`${item.emoji}をガーデンからはずす`}
              accessibilityRole="button"
            >
              <Text style={styles.deleteBtnText}>はずす</Text>
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// インベントリ行の1アイテム（タップでガーデンに配置）
// ──────────────────────────────────────────────────────────────
function InventoryItem({
  item,
  onPlace,
}: {
  item: ItemDef;
  onPlace: (item: ItemDef) => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSpring(0.88, { damping: 4 }, () => {
          scale.value = withSpring(1.0, { damping: 8 });
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPlace(item);
      }}
      style={styles.invItem}
      accessibilityLabel={`${item.label}（${item.rarity}）をガーデンに配置する`}
      accessibilityRole="button"
      accessibilityHint="タップするとガーデンに追加されます"
    >
      <Animated.View style={animStyle}>
        <View
          style={[
            styles.invItemGlow,
            { backgroundColor: RARITY_COLOR[item.rarity] },
          ]}
        />
        <Text style={styles.invEmoji}>{item.emoji}</Text>
        <Text style={styles.invLabel}>{item.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────
export function DecoGardenScreen({
  inventory,
  onCollectMore,
  onItemCollected,
  onBonusGranted,
}: DecoGardenScreenProps) {
  const { placed, placeItem, moveItem, removeItem, bringToFront } =
    useDecoGarden();

  // ガーデンレベルシステム
  const { level, nextLevelIn, levelProgress, onItemPlaced } = useGardenLevel();
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpInfo, setLevelUpInfo] = useState({ level: 1, message: "" });

  // ガーデンエリアのレイアウト
  const [gardenLayout, setGardenLayout] = useState<LayoutRectangle | null>(null);

  // ──────────────────────────────────
  // 美しさスコア計算
  // レアリティ係数: common=1, rare=3, epic=6, legendary=12
  // 10点ごとに★1（最大★5）
  // ──────────────────────────────────
  const beautyScore = useMemo(() => {
    if (placed.length === 0) return 0;
    return placed.reduce((sum, p) => {
      const def = ITEMS.find((i) => i.id === p.itemId);
      return sum + (def ? (RARITY_SCORE[def.rarity] ?? 1) : 1);
    }, 0);
  }, [placed]);

  const beautyStars = useMemo(() => {
    const stars = Math.min(5, Math.floor(beautyScore / MAX_SCORE_PER_STAR));
    return stars;
  }, [beautyScore]);

  const gardenW = gardenLayout?.width ?? W;
  const gardenH = gardenLayout?.height ?? 400;

  // インベントリアイテム配置 → ガーデン中央付近にランダムドロップ
  const handlePlace = useCallback(
    async (item: ItemDef) => {
      const cx = gardenW / 2 + (Math.random() - 0.5) * 80;
      const cy = gardenH / 2 + (Math.random() - 0.5) * 80;
      placeItem(item, cx, cy, gardenW, gardenH);
      onItemCollected(item); // App のインベントリから消費
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // レベルシステムに通知
      const result = await onItemPlaced();
      if (result.leveledUp) {
        setLevelUpInfo({ level: result.newLevel, message: result.message });
        setLevelUpVisible(true);
        onBonusGranted?.(); // 親にボーナス付与を通知
      }
    },
    [gardenW, gardenH, placeItem, onItemCollected, onItemPlaced, onBonusGranted]
  );

  // ──────────────────────────────────
  // ガーデンシェア
  // ──────────────────────────────────
  const handleShareGarden = useCallback(async () => {
    const starsText = "★".repeat(beautyStars) + "☆".repeat(5 - beautyStars);
    const itemCount = placed.length;
    const text = [
      `🌸 わたしのデコ・ガーデン`,
      `Lv${level} | うつくしさ ${starsText} (${beautyScore}pt)`,
      `アイテム${itemCount}こ配置中✨`,
      ``,
      `#デコガーデン #ひみつのデコガーデン`,
      `https://apps.apple.com/app/id0000000000`,
    ].join("\n");

    try {
      await Share.share({ message: text });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // キャンセルは無視
    }
  }, [level, beautyScore, beautyStars, placed.length]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* ガーデンヘッダー：レベル＋美しさスコア */}
      <View style={styles.gardenHeader}>
        <View style={styles.gardenTitleRow}>
          <Text style={styles.gardenTitle} accessibilityRole="header">
            わたしのにわ
          </Text>
          <View
            style={styles.levelBadge}
            accessibilityLabel={`ガーデンレベル${level}`}
            accessibilityRole="text"
          >
            <Text style={styles.levelBadgeText}>Lv {level}</Text>
          </View>
        </View>
        <View style={styles.headerBottomRow}>
          <View
            style={styles.beautyScoreWrap}
            accessibilityLabel={`うつくしさ${beautyStars}つ星・${beautyScore}ポイント`}
            accessibilityRole="text"
          >
            <Text style={styles.beautyLabel}>うつくしさ</Text>
            <Text style={styles.beautyStars} accessibilityLabel={`${beautyStars}つ星`}>
              {"★".repeat(beautyStars)}{"☆".repeat(5 - beautyStars)}
            </Text>
            <Text style={styles.beautyPoints}>{beautyScore}pt</Text>
          </View>
          {placed.length > 0 && (
            <Pressable
              onPress={handleShareGarden}
              style={styles.shareBtn}
              accessibilityLabel={`ガーデンをシェアする（Lv${level}・うつくしさ${beautyScore}pt）`}
              accessibilityRole="button"
            >
              <Text style={styles.shareBtnText}>シェア</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* レベルアップ進捗バー */}
      {level < 10 && (
        <View style={styles.levelProgressRow}>
          <Text style={styles.levelProgressLabel}>
            次のレベルまであと{nextLevelIn}こ
          </Text>
          <View style={styles.levelBarBg}>
            <View style={[styles.levelBarFill, { width: `${levelProgress * 100}%` }]} />
          </View>
        </View>
      )}

      {/* ガーデンエリア */}
      <View
        style={styles.garden}
        onLayout={(e) => setGardenLayout(e.nativeEvent.layout)}
      >
        {/* 背景グラデーション風 */}
        <View style={styles.gardenBg} pointerEvents="none" />

        {/* 配置済みアイテム */}
        {placed.map((p) => (
          <DraggablePlaced
            key={p.uid}
            item={p}
            gardenW={gardenW}
            gardenH={gardenH}
            onMove={moveItem}
            onBringFront={bringToFront}
            onRemove={removeItem}
          />
        ))}

        {/* 空の場合のプレースホルダー */}
        {placed.length === 0 && (
          <View style={styles.emptyHint} pointerEvents="none">
            <Text style={styles.emptyHintText}>
              したのアイテムをタップして{"\n"}にわにかざろう 🌸
            </Text>
          </View>
        )}
      </View>

      {/* インベントリ */}
      <View style={styles.inventoryContainer}>
        <View style={styles.inventoryHeader}>
          <Text
            style={styles.inventoryTitle}
            accessibilityRole="text"
            accessibilityLabel={`もちもの${inventory.length}こ`}
          >
            もちもの ({inventory.length}こ)
          </Text>
          <Pressable
            onPress={onCollectMore}
            style={styles.moreBtn}
            accessibilityLabel="スクラッチ画面でアイテムを集める"
            accessibilityRole="button"
          >
            <Text style={styles.moreBtnText}>＋ あつめる</Text>
          </Pressable>
        </View>

        {inventory.length === 0 ? (
          <View style={styles.inventoryEmpty}>
            <Text style={styles.inventoryEmptyText}>
              スクラッチでアイテムをあつめよう！
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inventoryScroll}
          >
            {inventory.map((item, idx) => (
              <InventoryItem key={`${item.id}_${idx}`} item={item} onPlace={handlePlace} />
            ))}
          </ScrollView>
        )}
      </View>
      {/* レベルアップモーダル */}
      <LevelUpModal
        visible={levelUpVisible}
        level={levelUpInfo.level}
        message={levelUpInfo.message}
        onClose={() => setLevelUpVisible(false)}
      />
    </GestureHandlerRootView>
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

  // ガーデンヘッダー
  gardenHeader: {
    flexDirection: "column",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,160,255,0.25)",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  gardenTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gardenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFD6EC",
    letterSpacing: 1,
  },
  levelBadge: {
    backgroundColor: "#FFD700",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1A1030",
  },
  levelProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10,
  },
  levelProgressLabel: {
    fontSize: 11,
    color: "#C0A8E0",
    width: 130,
  },
  levelBarBg: {
    flex: 1,
    height: 5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  levelBarFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  beautyScoreWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(192,96,255,0.15)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(192,96,255,0.30)",
  },
  beautyLabel: {
    fontSize: 11,
    color: "#C0A8E0",
    fontWeight: "600",
  },
  beautyStars: {
    fontSize: 14,
    color: "#FFD700",
    letterSpacing: 1,
  },
  beautyPoints: {
    fontSize: 11,
    color: "#C0A8E0",
    fontWeight: "600",
  },
  headerBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    backgroundColor: "rgba(29,161,242,0.18)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(29,161,242,0.4)",
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1DA1F2",
  },

  // ガーデン
  garden: {
    flex: 1,
    overflow: "hidden",
    margin: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(200,160,255,0.25)",
  },
  gardenBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#221540",
  },
  emptyHint: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHintText: {
    fontSize: 15,
    color: "rgba(200,160,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
  },

  // インベントリ
  inventoryContainer: {
    height: INVENTORY_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: "rgba(200,160,255,0.3)",
    backgroundColor: "rgba(30,16,60,0.85)",
  },
  inventoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E8D6FF",
  },
  moreBtn: {
    backgroundColor: "rgba(192,96,255,0.85)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(192,96,255,0.5)",
    minHeight: 32,
    justifyContent: "center",
  },
  moreBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  inventoryScroll: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  inventoryEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inventoryEmptyText: {
    fontSize: 13,
    color: "rgba(200,160,255,0.5)",
  },

  // インベントリアイテム
  invItem: {
    alignItems: "center",
    marginRight: 12,
    width: 64,
  },
  invItemGlow: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    opacity: 0.25,
  },
  invEmoji: {
    fontSize: 40,
    textAlign: "center",
  },
  invLabel: {
    fontSize: 10,
    color: "#E8D6FF",
    marginTop: 2,
    textAlign: "center",
  },

  // 削除確認
  deleteModal: {
    position: "absolute",
    top: "35%",
    left: W / 2 - 130,
    width: 260,
    backgroundColor: "#2A1860",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    zIndex: 9999,
    borderWidth: 1,
    borderColor: "rgba(200,160,255,0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
  },
  deleteTitle: {
    fontSize: 16,
    color: "#E8D6FF",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  deleteButtons: {
    flexDirection: "row",
    gap: 12,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtnCancel: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  deleteBtnConfirm: {
    backgroundColor: "#FF4060",
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
