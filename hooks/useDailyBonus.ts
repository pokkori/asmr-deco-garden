/**
 * hooks/useDailyBonus.ts
 * ──────────────────────────────────────────────────────────────
 * 毎日ログインボーナスシステム
 *
 * - 毎日初回起動時に「おはよう！今日も1枚プレゼント🎁」
 * - スクラッチ残り回数に +1 付与
 * - 7日連続ログインで特別アイテム（legendary確定）のフラグを立てる
 * - AsyncStorageで保存
 * ──────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "deco_daily_bonus";

interface BonusData {
  lastDate: string;      // "YYYY-MM-DD"
  streak: number;        // 連続ログイン日数
  totalDays: number;     // 通算ログイン日数
}

export interface DailyBonusResult {
  /** 今日初回ログイン時のみ true */
  isTodayFirst: boolean;
  /** 現在の連続ログイン日数 */
  streak: number;
  /** 通算ログイン日数 */
  totalDays: number;
  /** 7日連続ボーナス（legendary確定）が発生したか */
  isStreakBonus: boolean;
  /** 表示用メッセージ */
  message: string;
  isLoaded: boolean;
}

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useDailyBonus(): DailyBonusResult {
  const [result, setResult] = useState<DailyBonusResult>({
    isTodayFirst: false,
    streak: 0,
    totalDays: 0,
    isStreakBonus: false,
    message: "",
    isLoaded: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const today = todayString();
        const yesterday = yesterdayString();
        const raw = await AsyncStorage.getItem(STORAGE_KEY);

        let data: BonusData = { lastDate: "", streak: 0, totalDays: 0 };
        if (raw) {
          data = JSON.parse(raw);
        }

        // すでに今日ログイン済み
        if (data.lastDate === today) {
          setResult({
            isTodayFirst: false,
            streak: data.streak,
            totalDays: data.totalDays,
            isStreakBonus: false,
            message: "",
            isLoaded: true,
          });
          return;
        }

        // 新しい日のログイン
        const isContinuous = data.lastDate === yesterday;
        const newStreak = isContinuous ? data.streak + 1 : 1;
        const newTotalDays = data.totalDays + 1;
        const isStreakBonus = newStreak > 0 && newStreak % 7 === 0;

        const newData: BonusData = {
          lastDate: today,
          streak: newStreak,
          totalDays: newTotalDays,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));

        let message = "";
        if (isStreakBonus) {
          message = `🎊 ${newStreak}日れんぞくログイン！\nスペシャルレジェンダリーアイテム確定！🐉`;
        } else if (newStreak >= 3) {
          message = `おはよう！${newStreak}日れんぞくボーナス✨\nスクラッチ1まいプレゼント🎁`;
        } else {
          message = `おはよう！きょうも1まいプレゼント🎁\nがんばって！`;
        }

        setResult({
          isTodayFirst: true,
          streak: newStreak,
          totalDays: newTotalDays,
          isStreakBonus,
          message,
          isLoaded: true,
        });
      } catch {
        setResult((prev) => ({ ...prev, isLoaded: true }));
      }
    })();
  }, []);

  return result;
}
