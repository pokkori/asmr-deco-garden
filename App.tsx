/**
 * App.tsx
 * ──────────────────────────────────────────────────────────────
 * ひみつのデコ・ガーデン — ルートナビゲーション
 *
 * タブ構成:
 *   🪄 スクラッチ  →  CollectionScreen
 *   🌸 にわ        →  DecoGardenScreen（レベルシステム内蔵）
 *   📖 ずかん      →  CollectionBook
 *
 * 追加:
 *   - FTUE（初回のみ）
 *   - AsyncStorage でインベントリ永続化
 *   - 毎日ログインボーナス（useDailyBonus）
 *   - ガーデンレベルアップ連携（ボーナススクラッチ）
 * ──────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { CollectionScreen } from "./components/CollectionScreen";
import { DecoGardenScreen } from "./components/DecoGardenScreen";
import { CollectionBook } from "./components/CollectionBook";
import { FTUEGuide } from "./components/FTUEGuide";
import { DailyBonusModal } from "./components/DailyBonusModal";
import { ItemDef } from "./constants/items";
import { useDailyBonus } from "./hooks/useDailyBonus";
import { useNotifications } from "./hooks/useNotifications";

const { width: W } = Dimensions.get("window");

// ──────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────
const STORAGE_KEY_INVENTORY = "deco_garden_inventory";
const STORAGE_KEY_FTUE_DONE = "deco_garden_ftue_done";
// 全収集済みアイテム種類記録（図鑑用）
const STORAGE_KEY_EVER_COLLECTED = "deco_garden_ever_collected";

type Tab = "scratch" | "garden" | "book";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "scratch", label: "スクラッチ", emoji: "🪄" },
  { id: "garden",  label: "にわ",       emoji: "🌸" },
  { id: "book",    label: "ずかん",     emoji: "📖" },
];

// ──────────────────────────────────────────────────────────────
// タブバー
// ──────────────────────────────────────────────────────────────
function TabBar({
  activeTab,
  onSelect,
}: {
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <View style={tabStyles.container}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={[tabStyles.tab, isActive && tabStyles.tabActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(tab.id);
            }}
            accessibilityLabel={`${tab.label}タブ`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={tabStyles.emoji}>{tab.emoji}</Text>
            <Text
              style={[tabStyles.label, isActive && tabStyles.labelActive]}
            >
              {tab.label}
            </Text>
            {isActive && <View style={tabStyles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(200,160,255,0.2)",
    backgroundColor: "rgba(20,10,40,0.98)",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    position: "relative",
  },
  tabActive: {
    backgroundColor: "rgba(200,96,255,0.08)",
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 11,
    color: "rgba(200,160,255,0.5)",
    marginTop: 2,
  },
  labelActive: {
    color: "#C060FF",
    fontWeight: "700",
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: "10%",
    right: "10%",
    height: 2,
    borderRadius: 1,
    backgroundColor: "#C060FF",
  },
});

// ──────────────────────────────────────────────────────────────
// メインアプリ
// ──────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scratch");
  const [inventory, setInventory] = useState<ItemDef[]>([]);
  // 図鑑用：一度でも収集したことのあるアイテムリスト（重複なし・永続）
  const [everCollected, setEverCollected] = useState<ItemDef[]>([]);
  const [showFTUE, setShowFTUE] = useState(false);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────
  // デイリーボーナス
  // ──────────────────────────────────
  const dailyBonus = useDailyBonus();

  // ──────────────────────────────────
  // プッシュ通知（FTUEが完了してから許可リクエスト）
  // ──────────────────────────────────
  useNotifications({
    streak: dailyBonus.streak,
    enabled: !loading && !showFTUE && dailyBonus.isLoaded,
  });

  // ロード完了後にデイリーボーナスモーダルを表示
  useEffect(() => {
    if (!loading && dailyBonus.isLoaded && dailyBonus.isTodayFirst) {
      // 少し遅らせてFTUEと被らないように
      const timer = setTimeout(() => setShowDailyBonus(true), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, dailyBonus.isLoaded, dailyBonus.isTodayFirst]);

  // ──────────────────────────────────
  // 初期化: AsyncStorage 読み込み
  // ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rawInv, ftueDone, rawEver] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_INVENTORY),
          AsyncStorage.getItem(STORAGE_KEY_FTUE_DONE),
          AsyncStorage.getItem(STORAGE_KEY_EVER_COLLECTED),
        ]);
        if (rawInv) {
          setInventory(JSON.parse(rawInv));
        }
        if (rawEver) {
          setEverCollected(JSON.parse(rawEver));
        }
        if (!ftueDone) {
          setShowFTUE(true);
        }
      } catch {
        // ストレージエラーは無視
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ──────────────────────────────────
  // インベントリ永続化
  // ──────────────────────────────────
  const saveInventory = useCallback(async (items: ItemDef[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  const saveEverCollected = useCallback(async (items: ItemDef[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_EVER_COLLECTED, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  // ──────────────────────────────────
  // アイテム収集
  // ──────────────────────────────────
  const handleCollect = useCallback(
    (item: ItemDef) => {
      // インベントリに追加
      setInventory((prev) => {
        const next = [...prev, item];
        saveInventory(next);
        return next;
      });
      // 図鑑用 everCollected にも追加（同IDは重複しない）
      setEverCollected((prev) => {
        if (prev.some((i) => i.id === item.id)) return prev;
        const next = [...prev, item];
        saveEverCollected(next);
        return next;
      });
    },
    [saveInventory, saveEverCollected]
  );

  // ──────────────────────────────────
  // インベントリからアイテム消費（配置時）
  // ──────────────────────────────────
  const handleItemPlaced = useCallback(
    (item: ItemDef) => {
      setInventory((prev) => {
        const idx = prev.findIndex((i) => i.id === item.id);
        if (idx < 0) return prev;
        const next = [
          ...prev.slice(0, idx),
          ...prev.slice(idx + 1),
        ];
        saveInventory(next);
        return next;
      });
    },
    [saveInventory]
  );

  // ──────────────────────────────────
  // レベルアップボーナス（スクラッチ+1）
  // useDailyLimit は CollectionScreen 内部で管理しているため、
  // ここでは「ボーナス付与通知」のみを受け取り、
  // CollectionScreen に ref 経由で渡す方法の代わりに
  // App レベルのボーナスカウンター stateで管理する
  // ──────────────────────────────────
  const [pendingBonusCount, setPendingBonusCount] = useState(0);

  const handleBonusGranted = useCallback(() => {
    setPendingBonusCount((c) => c + 1);
  }, []);

  // デイリーボーナスで+1
  const handleDailyBonusClose = useCallback(() => {
    setShowDailyBonus(false);
    if (dailyBonus.isTodayFirst && !dailyBonus.isStreakBonus) {
      setPendingBonusCount((c) => c + 1);
    } else if (dailyBonus.isStreakBonus) {
      // 7日連続は+2枚
      setPendingBonusCount((c) => c + 2);
    }
  }, [dailyBonus.isTodayFirst, dailyBonus.isStreakBonus]);

  // ──────────────────────────────────
  // FTUE 閉じる
  // ──────────────────────────────────
  const handleFTUEDismiss = useCallback(async () => {
    setShowFTUE(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FTUE_DONE, "1");
    } catch {
      // ignore
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>✨</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1030" />

      {/* ヘッダー */}
      <View style={styles.appHeader}>
        <Text style={styles.appTitle}>🌸 ひみつのデコ・ガーデン</Text>
        <View style={styles.headerRight}>
          {pendingBonusCount > 0 && (
            <View style={styles.bonusBadge}>
              <Text style={styles.bonusBadgeText}>🎁 +{pendingBonusCount}</Text>
            </View>
          )}
          <View style={styles.inventoryBadge}>
            <Text style={styles.inventoryBadgeText}>🎒 {inventory.length}</Text>
          </View>
        </View>
      </View>

      {/* タブコンテンツ */}
      <View style={styles.content}>
        {activeTab === "scratch" ? (
          <CollectionScreen
            onCollect={handleCollect}
            bonusCount={pendingBonusCount}
            onBonusConsumed={() => setPendingBonusCount((c) => Math.max(0, c - 1))}
          />
        ) : activeTab === "garden" ? (
          <DecoGardenScreen
            inventory={inventory}
            onCollectMore={() => setActiveTab("scratch")}
            onItemCollected={handleItemPlaced}
            onBonusGranted={handleBonusGranted}
          />
        ) : (
          <CollectionBook collectedItems={everCollected} />
        )}
      </View>

      {/* タブバー */}
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      {/* FTUE */}
      <FTUEGuide visible={showFTUE} onDismiss={handleFTUEDismiss} />

      {/* デイリーボーナスモーダル */}
      <DailyBonusModal
        visible={showDailyBonus}
        streak={dailyBonus.streak}
        isStreakBonus={dailyBonus.isStreakBonus}
        message={dailyBonus.message}
        onClose={handleDailyBonusClose}
      />
    </SafeAreaView>
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
  loading: {
    flex: 1,
    backgroundColor: "#1A1030",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 48,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,160,255,0.15)",
  },
  appTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFD6EC",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bonusBadge: {
    backgroundColor: "rgba(255,215,0,0.2)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.5)",
  },
  bonusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFD700",
  },
  inventoryBadge: {
    backgroundColor: "rgba(192,96,255,0.2)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(192,96,255,0.4)",
  },
  inventoryBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E8D6FF",
  },
  content: {
    flex: 1,
  },
});
