/**
 * FTUEGuide.tsx
 * ──────────────────────────────────────────────────────────────
 * 初回チュートリアルガイド（3ステップ ウェルカム画面）
 *
 * - 初回起動時のみ表示（AsyncStorage の "deco_ftue_done" で管理）
 * - Step1: スクラッチでアイテムを集めよう
 * - Step2: にわに飾って自分だけのガーデンを作ろう
 * - Step3: 毎日ログインでレアアイテムが当たる！
 * - 最終ステップで「はじめる」→ AsyncStorage にフラグ保存 → onDismiss
 * - 指アニメーション (Step1 のみ) でスクラッチ操作を誘導
 * ──────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: W, height: H } = Dimensions.get("window");

const FTUE_STORAGE_KEY = "deco_ftue_done";

// ── ステップ定義 ─────────────────────────────────────────────
interface StepDef {
  emoji: string;
  title: string;
  body: string;
  showFinger: boolean;  // Step1 のみ指アニメを出す
}

const STEPS: StepDef[] = [
  {
    emoji: "✨",
    title: "こすってアイテムを\nあつめよう！",
    body: "画面をゆびでなぞると\nかくれたたからものが出てくるよ🎁",
    showFinger: true,
  },
  {
    emoji: "🌸",
    title: "にわをデコレーション\nしよう！",
    body: "あつめたアイテムを\nじぶんだけのガーデンにかざろう🏡",
    showFinger: false,
  },
  {
    emoji: "🎊",
    title: "まいにちログインで\nレアアイテムゲット！",
    body: "7日れんぞくログインで\nレジェンダリー確定！毎日あそんでね🌟",
    showFinger: false,
  },
];

interface FTUEGuideProps {
  visible: boolean;
  onDismiss: () => void;
}

export function FTUEGuide({ visible, onDismiss }: FTUEGuideProps) {
  const [step, setStep] = useState(0);
  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  // ── 指アニメーション（Step1 用）────────────────────────────
  const fingerX = useSharedValue(W * 0.25);
  const fingerY = useSharedValue(H * 0.35);
  const fingerScale = useSharedValue(1);
  const fingerOpacity = useSharedValue(0);

  // ── オーバーレイ & コンテンツ フェード ───────────────────
  const overlayOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  // ── ドット（ページインジケーター）アニメーション ─────────
  // step が変わるたびにコンテンツをフェードイン/アウト
  useEffect(() => {
    if (!visible) return;

    // オーバーレイはstep0のみフェードイン
    if (step === 0) {
      overlayOpacity.value = withTiming(1, { duration: 400 });
    }

    // コンテンツをリセット → フェードイン
    contentOpacity.value = 0;
    contentTranslateY.value = 20;
    contentOpacity.value = withTiming(1, { duration: 350 });
    contentTranslateY.value = withSpring(0, { damping: 14, stiffness: 180 });

    // 指アニメーション（Step1 のみ）
    if (currentStep.showFinger) {
      fingerOpacity.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 300 }),
            withTiming(0, { duration: 400 })
          ),
          -1,
          false
        )
      );
      fingerX.value = W * 0.25;
      fingerY.value = H * 0.38;
      fingerX.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(W * 0.65, {
              duration: 900,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }),
            withTiming(W * 0.25, { duration: 0 })
          ),
          -1,
          false
        )
      );
      fingerY.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(H * 0.52, {
              duration: 900,
              easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            }),
            withTiming(H * 0.38, { duration: 0 })
          ),
          -1,
          false
        )
      );
      fingerScale.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(0.85, { duration: 150 }),
            withTiming(1.0, { duration: 150 }),
            withTiming(1.0, { duration: 900 })
          ),
          -1,
          false
        )
      );
    } else {
      // Step1 以外は指を隠す
      cancelAnimation(fingerX);
      cancelAnimation(fingerY);
      cancelAnimation(fingerOpacity);
      cancelAnimation(fingerScale);
      fingerOpacity.value = withTiming(0, { duration: 200 });
    }

    return () => {
      cancelAnimation(fingerX);
      cancelAnimation(fingerY);
      cancelAnimation(fingerOpacity);
      cancelAnimation(fingerScale);
    };
  }, [visible, step]);

  const fingerStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: fingerX.value,
    top: fingerY.value,
    opacity: fingerOpacity.value,
    transform: [{ scale: fingerScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  // ── 「次へ」or「はじめる」ボタン押下 ─────────────────────
  const handleNext = async () => {
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }
    // 最終ステップ: AsyncStorage にフラグ保存
    try {
      await AsyncStorage.setItem(FTUE_STORAGE_KEY, "1");
    } catch {
      // 保存失敗は無視
    }
    // アニメーションをクリーンアップしてから onDismiss
    cancelAnimation(overlayOpacity);
    overlayOpacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      setStep(0);
      onDismiss();
    }, 320);
  };

  // ── 「スキップ」ボタン押下 ────────────────────────────────
  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(FTUE_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    cancelAnimation(overlayOpacity);
    overlayOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setStep(0);
      onDismiss();
    }, 220);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
        {/* ── コンテンツカード ────────────────────────────── */}
        <Animated.View style={[styles.card, contentStyle]}>
          {/* 大絵文字 */}
          <Text style={styles.cardEmoji}>{currentStep.emoji}</Text>

          {/* タイトル */}
          <Text style={styles.cardTitle}>{currentStep.title}</Text>

          {/* 説明文 */}
          <Text style={styles.cardBody}>{currentStep.body}</Text>

          {/* ページドット */}
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === step && styles.dotActive]}
              />
            ))}
          </View>

          {/* ボタン行 */}
          <View style={styles.btnRow}>
            {!isLastStep && (
              <Pressable
                onPress={handleSkip}
                style={styles.skipBtn}
                accessibilityLabel="チュートリアルをスキップする"
                accessibilityRole="button"
              >
                <Text style={styles.skipBtnText}>スキップ</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleNext}
              style={[styles.nextBtn, isLastStep && styles.nextBtnFull]}
              accessibilityLabel={isLastStep ? "ゲームをはじめる" : "次のステップへ進む"}
              accessibilityRole="button"
            >
              <Text style={styles.nextBtnText}>
                {isLastStep ? "🌸 はじめる！" : "つぎへ →"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── 指アニメーション（Step1 のみ）─────────────────── */}
        <Animated.View style={fingerStyle} pointerEvents="none">
          <Text style={styles.fingerEmoji}>👆</Text>
          <View style={styles.glowTrail} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── AsyncStorage チェックユーティリティ（呼び出し元で使用）──
export async function checkFTUEDone(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(FTUE_STORAGE_KEY);
    return val === "1";
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 10, 40, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  // ── カード ──────────────────────────────────────────────────
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#2A1860",
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(200,160,255,0.35)",
    shadowColor: "#C060FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 16,
  },
  cardEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFD6EC",
    textAlign: "center",
    lineHeight: 32,
    letterSpacing: 0.5,
    marginBottom: 14,
    textShadowColor: "#FF80C0",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  cardBody: {
    fontSize: 15,
    color: "#C8B0E8",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },

  // ── ページドット ─────────────────────────────────────────────
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(200,160,255,0.30)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#C060FF",
  },

  // ── ボタン行 ─────────────────────────────────────────────────
  btnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(200,160,255,0.20)",
  },
  skipBtnText: {
    fontSize: 14,
    color: "rgba(200,160,255,0.70)",
    fontWeight: "600",
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#C060FF",
    shadowColor: "#C060FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  nextBtnFull: {
    flex: 1,  // 最終ステップは「スキップ」なしで全幅
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  // ── 指アニメーション ─────────────────────────────────────────
  fingerEmoji: {
    fontSize: 52,
  },
  glowTrail: {
    position: "absolute",
    bottom: -4,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFD6EC",
    opacity: 0.5,
  },
});
