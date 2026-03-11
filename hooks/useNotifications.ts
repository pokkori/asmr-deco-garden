/**
 * hooks/useNotifications.ts
 * ──────────────────────────────────────────────────────────────
 * プッシュ通知システム
 *
 * 機能:
 *   - 初回起動時に通知パーミッションをリクエスト
 *   - 毎日 09:00 に「スクラッチ券が届きました」通知をスケジュール
 *   - 7日連続ログインが近い場合（6日目）に特別通知
 *   - アプリ起動時に既存スケジュールをキャンセル→再登録（重複防止）
 * ──────────────────────────────────────────────────────────────
 */

import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 通知ハンドラー設定（フォアグラウンドでも表示）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_ID_DAILY = "deco_garden_daily";
const NOTIFICATION_ID_STREAK = "deco_garden_streak";

/**
 * 通知パーミッションを要求する
 * @returns granted かどうか
 */
async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === "granted") return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return status === "granted";
}

/**
 * 毎日09:00の通知をスケジュール（Android: daily repeat / iOS: daily repeat）
 */
async function scheduleDailyNotification(): Promise<void> {
  // 既存の同一IDスケジュールをキャンセル
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID_DAILY).catch(() => {});

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID_DAILY,
    content: {
      title: "🌸 デコ・ガーデン",
      body: "今日のスクラッチ券が届きました🎁 タップしてひらこう！",
      sound: true,
      badge: 1,
      data: { type: "daily_scratch" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });
}

/**
 * 6日連続ログイン時に「明日は伝説のアイテム確定！」通知をスケジュール
 * 当日21:00に通知する
 */
async function scheduleStreakReminderNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID_STREAK).catch(() => {});

  const now = new Date();
  const trigger = new Date(now);
  trigger.setHours(21, 0, 0, 0);

  // 今日21時がすでに過ぎていたら明日に
  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID_STREAK,
    content: {
      title: "🐉 明日は伝説のアイテム確定！",
      body: "6日れんぞくログイン中！明日ログインするとLEGENDARYアイテムが確定でもらえます✨",
      sound: true,
      badge: 1,
      data: { type: "streak_reminder" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

interface UseNotificationsOptions {
  /** 現在の連続ログイン日数 */
  streak: number;
  /** 通知許可を求めるか（FTUEが完了した後にtrueにする） */
  enabled: boolean;
}

export function useNotifications({ streak, enabled }: UseNotificationsOptions): void {
  useEffect(() => {
    if (!enabled) return;

    (async () => {
      const granted = await requestPermissions();
      if (!granted) return;

      // 毎日のデイリー通知をスケジュール
      await scheduleDailyNotification();

      // 6日連続の場合は翌日の特別通知を追加
      if (streak > 0 && streak % 7 === 6) {
        await scheduleStreakReminderNotification();
      }
    })();
  }, [enabled, streak]);
}
