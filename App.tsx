/**
 * App.tsx
 * ──────────────────────────────────────────────────────────────
 * ひみつのデコ・ガーデン — ルートナビゲーション
 *
 * タブ構成:
 *   🪄 スクラッチ  →  CollectionScreen
 *   🌸 にわ        →  DecoGardenScreen
 *
 * 追加:
 *   - FTUE（初回のみ）
 *   - AsyncStorage でインベントリ永続化
 * ──────────────────────────────────────────────────────────────
 */

import React, { useCallback, useEffect, useState } from "react";
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
import { FTUEGuide } from "./components/FTUEGuide";
import { ItemDef } from "./constants/items";

const { width: W } = Dimensions.get("window");

// ──────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────
const STORAGE_KEY_INVENTORY = "deco_garden_inventory";
const STORAGE_KEY_FTUE_DONE = "deco_garden_ftue_done";

type Tab = "scratch" | "garden";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "scratch", label: "スクラッチ", emoji: "🪄" },
  { id: "garden",  label: "にわ",       emoji: "🌸" },
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
  const [showFTUE, setShowFTUE] = useState(false);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────
  // 初期化: AsyncStorage 読み込み
  // ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rawInv, ftueDone] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_INVENTORY),
          AsyncStorage.getItem(STORAGE_KEY_FTUE_DONE),
        ]);
        if (rawInv) {
          setInventory(JSON.parse(rawInv));
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

  // ──────────────────────────────────
  // アイテム収集
  // ──────────────────────────────────
  const handleCollect = useCallback(
    (item: ItemDef) => {
      setInventory((prev) => {
        const next = [...prev, item];
        saveInventory(next);
        return next;
      });
    },
    [saveInventory]
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
        <View style={styles.inventoryBadge}>
          <Text style={styles.inventoryBadgeText}>🎒 {inventory.length}</Text>
        </View>
      </View>

      {/* タブコンテンツ */}
      <View style={styles.content}>
        {activeTab === "scratch" ? (
          <CollectionScreen onCollect={handleCollect} />
        ) : (
          <DecoGardenScreen
            inventory={inventory}
            onCollectMore={() => setActiveTab("scratch")}
            onItemCollected={handleItemPlaced}
          />
        )}
      </View>

      {/* タブバー */}
      <TabBar activeTab={activeTab} onSelect={setActiveTab} />

      {/* FTUE */}
      <FTUEGuide visible={showFTUE} onDismiss={handleFTUEDismiss} />
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
