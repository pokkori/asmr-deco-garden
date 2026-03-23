/**
 * hooks/useDailyLimit.ts
 * ──────────────────────────────────────────────────────────────
 * 1日のスクラッチ回数制限
 *
 * - AsyncStorage に今日の日付とスクラッチ回数を保存
 * - 1日 MAX_DAILY_SCRATCHES 回まで無料
 * - 日付が変わったら自動リセット
 * ──────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "deco_daily_scratch";
const MAX_DAILY_SCRATCHES = 5;

interface DailyRecord {
  date: string;   // "YYYY-MM-DD"
  count: number;
}

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface UseDailyLimitReturn {
  /** 今日の残り回数 */
  remaining: number;
  /** 今日の最大回数 */
  maxDaily: number;
  /** 上限に達しているか */
  isLimitReached: boolean;
  /** スクラッチ1回消費（上限超えの場合は false を返す） */
  consumeOne: () => Promise<boolean>;
  /** ロード完了か */
  isLoaded: boolean;
}

export function useDailyLimit(): UseDailyLimitReturn {
  const [count, setCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初回ロード
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const record: DailyRecord = JSON.parse(raw);
          if (record.date === todayString()) {
            setCount(record.count);
          } else {
            // 日付が変わっていたらリセット
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ date: todayString(), count: 0 })
            );
            setCount(0);
          }
        } else {
          setCount(0);
        }
      } catch {
        // AsyncStorage エラーは無視して続行
        setCount(0);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const consumeOne = useCallback(async (): Promise<boolean> => {
    if (count >= MAX_DAILY_SCRATCHES) return false;

    const newCount = count + 1;
    setCount(newCount);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: todayString(), count: newCount })
      );
    } catch {
      // 保存失敗は無視（UX を壊さないため）
    }
    return true;
  }, [count]);

  return {
    remaining: Math.max(0, MAX_DAILY_SCRATCHES - count),
    maxDaily: MAX_DAILY_SCRATCHES,
    isLimitReached: count >= MAX_DAILY_SCRATCHES,
    consumeOne,
    isLoaded,
  };
}
