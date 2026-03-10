/**
 * useScratchProgress.ts
 * ──────────────────────────────────────────────────────────────
 * スクラッチ進捗の管理フック
 *
 * - 進捗 0〜1 を管理
 * - 80% 達成時に onThresholdReached を発火
 * - 「ぷにっ」ボタンアニメーション用の Reanimated 値も返す
 * ──────────────────────────────────────────────────────────────
 */

import { useCallback, useRef, useState } from "react";
import {
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

interface UseScratchProgressOptions {
  threshold?: number;          // デフォルト 0.8
  onThresholdReached?: () => void;
}

export function useScratchProgress({
  threshold = 0.8,
  onThresholdReached,
}: UseScratchProgressOptions = {}) {
  const [progress, setProgress] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const hasTriggered = useRef(false);

  // 「ぷにっ」ジェリーバウンス用
  const bounceScale = useSharedValue(1);

  const triggerBounce = useCallback(() => {
    bounceScale.value = withSequence(
      withSpring(0.92, { damping: 3, stiffness: 400 }),  // 凹む
      withSpring(1.06, { damping: 4, stiffness: 300 }),  // 跳ね返る
      withSpring(1.00, { damping: 10, stiffness: 200 })  // 収束
    );
  }, [bounceScale]);

  const handleProgress = useCallback(
    (ratio: number) => {
      setProgress(ratio);

      // マイルストーン振動（25%, 50%, 75%）
      const milestones = [0.25, 0.50, 0.75];
      for (const m of milestones) {
        if (ratio >= m && progress < m) {
          triggerBounce();
          break;
        }
      }

      // 閾値到達
      if (!hasTriggered.current && ratio >= threshold) {
        hasTriggered.current = true;
        setIsRevealed(true);
        triggerBounce();
        onThresholdReached?.();
      }
    },
    [progress, threshold, onThresholdReached, triggerBounce]
  );

  const reset = useCallback(() => {
    setProgress(0);
    setIsRevealed(false);
    hasTriggered.current = false;
  }, []);

  return {
    progress,           // 0〜1
    progressPct: Math.round(progress * 100), // 0〜100 (表示用)
    isRevealed,
    bounceScale,        // Reanimated SharedValue → useAnimatedStyle で使う
    onProgress: handleProgress,
    reset,
  };
}
