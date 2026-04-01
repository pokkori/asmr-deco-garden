/**
 * hooks/useNotifications.ts
 * ──────────────────────────────────────────────────────────────
 * プッシュ通知システム
 *
 * NOTE: expo-notifications は Expo SDK 55 で削除されました。
 * SDK55 対応として通知機能を no-op に変更しています。
 * 将来的に expo-notifications 代替が安定したら再実装予定。
 * ──────────────────────────────────────────────────────────────
 */

// expo-notifications は SDK55 で削除済みのためインポートしない

interface UseNotificationsOptions {
  /** 現在の連続ログイン日数 */
  streak: number;
  /** 通知許可を求めるか（FTUEが完了した後にtrueにする） */
  enabled: boolean;
}

export function useNotifications({ streak, enabled }: UseNotificationsOptions): void {
  // SDK55 で expo-notifications が削除されたため no-op
  // streak / enabled は将来の再実装のために引数として保持
  void streak;
  void enabled;
}
