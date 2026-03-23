/**
 * hooks/useGardenLevel.ts
 * ──────────────────────────────────────────────────────────────
 * ガーデンレベルアップシステム
 *
 * - 配置アイテム数に応じてガーデンレベルアップ（Lv1〜10）
 * - レベルアップ時に特別メッセージ＋ボーナススクラッチ1枚付与
 * - AsyncStorageで保存
 * ──────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "deco_garden_level";

/** レベルアップに必要な累計配置アイテム数 */
const LEVEL_THRESHOLDS: Record<number, number> = {
  1:  0,
  2:  3,
  3:  7,
  4:  12,
  5:  20,
  6:  30,
  7:  42,
  8:  56,
  9:  72,
  10: 90,
};

const MAX_LEVEL = 10;

/** レベル別のメッセージ */
const LEVEL_UP_MESSAGES: Record<number, string> = {
  2:  "すてき！にわがLv2になったよ🌱\nボーナスで1まいプレゼント🎁",
  3:  "いい感じ！Lv3の魔法のにわ✨\nボーナスで1まいプレゼント🎁",
  4:  "うわあ！Lv4にアップ！🌸\nスクラッチ1まいプレゼント🎁",
  5:  "すごい！Lv5！はんぶん制覇！🌟\nボーナスで1まいプレゼント🎁",
  6:  "キラキラLv6！まほうつかいみたい💎\nボーナスで1まいプレゼント🎁",
  7:  "Lv7！にわがかがやいてる🦋\nスクラッチ1まいプレゼント🎁",
  8:  "もうすぐ最高レベル！Lv8👑\nボーナスで1まいプレゼント🎁",
  9:  "Lv9！レジェンドクラス！🐉\nスクラッチ1まいプレゼント🎁",
  10: "🏆 Lv10 最高のにわが完成！\nおめでとう！ボーナス1まいプレゼント🎁",
};

interface LevelData {
  level: number;
  totalPlaced: number;
  bonusCount: number; // ボーナスで追加されたスクラッチ回数（未使用分）
}

export interface UseGardenLevelReturn {
  level: number;
  totalPlaced: number;
  /** 次のレベルまでの残り配置数（MAX時は0） */
  nextLevelIn: number;
  /** 現在レベルの進捗 0.0〜1.0 */
  levelProgress: number;
  /** ボーナススクラッチ残り枚数 */
  bonusCount: number;
  /** 配置完了時に呼ぶ（1回分カウントアップ） */
  onItemPlaced: () => Promise<{ leveledUp: boolean; newLevel: number; message: string }>;
  /** ボーナス1枚を消費する */
  consumeBonus: () => Promise<boolean>;
  isLoaded: boolean;
}

export function useGardenLevel(): UseGardenLevelReturn {
  const [data, setData] = useState<LevelData>({ level: 1, totalPlaced: 0, bonusCount: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved: LevelData = JSON.parse(raw);
          setData(saved);
        }
      } catch {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const saveData = useCallback(async (d: LevelData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      // ignore
    }
  }, []);

  const onItemPlaced = useCallback(async (): Promise<{
    leveledUp: boolean;
    newLevel: number;
    message: string;
  }> => {
    const current = dataRef.current;
    const newTotal = current.totalPlaced + 1;

    // 新しいレベルを計算
    let newLevel = current.level;
    for (let lv = current.level + 1; lv <= MAX_LEVEL; lv++) {
      if (newTotal >= LEVEL_THRESHOLDS[lv]) {
        newLevel = lv;
      } else {
        break;
      }
    }

    const leveledUp = newLevel > current.level;
    const newBonus = leveledUp ? current.bonusCount + 1 : current.bonusCount;
    const newData: LevelData = {
      level: newLevel,
      totalPlaced: newTotal,
      bonusCount: newBonus,
    };

    setData(newData);
    await saveData(newData);

    return {
      leveledUp,
      newLevel,
      message: leveledUp ? (LEVEL_UP_MESSAGES[newLevel] ?? `Lv${newLevel}にアップ！🎉\nボーナス1まいプレゼント🎁`) : "",
    };
  }, [saveData]);

  const consumeBonus = useCallback(async (): Promise<boolean> => {
    const current = dataRef.current;
    if (current.bonusCount <= 0) return false;
    const newData: LevelData = { ...current, bonusCount: current.bonusCount - 1 };
    setData(newData);
    await saveData(newData);
    return true;
  }, [saveData]);

  // nextLevelIn 計算
  const { level, totalPlaced, bonusCount } = data;
  const nextThreshold = level < MAX_LEVEL ? LEVEL_THRESHOLDS[level + 1] : null;
  const currentThreshold = LEVEL_THRESHOLDS[level] ?? 0;
  const nextLevelIn = nextThreshold != null ? Math.max(0, nextThreshold - totalPlaced) : 0;
  const levelProgress =
    nextThreshold != null && nextThreshold > currentThreshold
      ? Math.min(1, (totalPlaced - currentThreshold) / (nextThreshold - currentThreshold))
      : 1;

  return {
    level,
    totalPlaced,
    nextLevelIn,
    levelProgress,
    bonusCount,
    onItemPlaced,
    consumeBonus,
    isLoaded,
  };
}
