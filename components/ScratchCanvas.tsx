/**
 * ScratchCanvas.tsx
 * ──────────────────────────────────────────────────────────────
 * 「磨きアクション」メインコンポーネント
 *
 * 仕組み:
 *  ┌──────────────────────────────┐
 *  │  Canvas                      │
 *  │  ├─ [Layer 0] PrizeLayer     │  ← キラキラ背景（常に表示）
 *  │  └─ [Layer 1] DirtLayer      │  ← 汚れ（SaveLayer）
 *  │      ├─ Rect (汚れ塗りつぶし)  │
 *  │      └─ Group(blendMode=Clear)│  ← ユーザー軌跡で穴を開ける
 *  │          └─ paths[]           │
 *  └──────────────────────────────┘
 *
 * 依存:
 *   @shopify/react-native-skia ^1.x
 *   react-native-gesture-handler ^2.x
 *   react-native-reanimated ^3.x
 *   expo-haptics
 * ──────────────────────────────────────────────────────────────
 */

import React, { useCallback, useRef, useState } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import {
  Canvas,
  Circle,
  Fill,
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  SkPath,
  vec,
} from "@shopify/react-native-skia";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

// ──────────────────────────────────────────────────────────────
// 定数
// ──────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const CANVAS_SIZE = SCREEN_W - 32;       // 左右16pxマージン
const SCRATCH_RADIUS = 28;               // 指の太さ（px）
const REVEAL_THRESHOLD = 0.80;          // 80% 消したら自動クリア
const PIXEL_SAMPLE_STEP = 8;            // 面積計算のグリッド粗さ（軽量化）

// パステル「魔法少女界隈」カラーパレット
const COLORS = {
  dirtTop: "#B8B8D0",        // 汚れ上部（パール灰）
  dirtBottom: "#8888A8",     // 汚れ下部（暗めの紫灰）
  prizeGlow: "#FFD6EC",      // キラキラ ピンク
  prizeShine: "#D6F0FF",     // キラキラ ブルー
  holographic: "#E8D6FF",    // ホログラフィック
  sparkle: "#FFFDE0",        // 光の粒
} as const;

// ──────────────────────────────────────────────────────────────
// 型
// ──────────────────────────────────────────────────────────────
interface ScratchCanvasProps {
  /** 下に表示するキラキラアイテムのコンポーネント（任意） */
  prizeContent?: React.ReactNode;
  /** 80% 達成・全消去完了時のコールバック */
  onRevealed?: () => void;
  /** スクラッチ進捗 0〜1 が変わるたびに呼ばれる */
  onProgress?: (progress: number) => void;
}

// ──────────────────────────────────────────────────────────────
// ハプティクス制御（JSスレッド側）
// ──────────────────────────────────────────────────────────────
let _lastHapticAt = 0;
let _lastVelocity = 0;

function triggerScratchHaptic(velocityX: number, velocityY: number): void {
  const now = Date.now();
  const speed = Math.sqrt(velocityX ** 2 + velocityY ** 2);
  const interval = speed > 600 ? 30 : speed > 300 ? 60 : 100; // 速いほど頻繁に

  if (now - _lastHapticAt < interval) return;
  _lastHapticAt = now;
  _lastVelocity = speed;

  if (speed > 600) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } else if (speed > 200) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function triggerRevealHaptic(): void {
  // 全消去: ドラムロール的な連続振動
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// ──────────────────────────────────────────────────────────────
// 面積計算（グリッドサンプリング方式・JS側で軽量処理）
// ──────────────────────────────────────────────────────────────
function calcRevealedRatio(paths: SkPath[], size: number): number {
  let revealed = 0;
  let total = 0;

  for (let x = 0; x < size; x += PIXEL_SAMPLE_STEP) {
    for (let y = 0; y < size; y += PIXEL_SAMPLE_STEP) {
      total++;
      // いずれかのパスが含むなら「消去済み」
      for (const p of paths) {
        if (p.contains(x, y)) {
          revealed++;
          break;
        }
      }
    }
  }

  return total === 0 ? 0 : revealed / total;
}

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────
export function ScratchCanvas({
  prizeContent,
  onRevealed,
  onProgress,
}: ScratchCanvasProps) {
  // 描画済みパス一覧（確定済みストローク）
  const [paths, setPaths] = useState<SkPath[]>([]);
  // 現在描いているストローク（指が離れるまで）
  const currentPathRef = useRef<SkPath | null>(null);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);

  // 全消去済みフラグ
  const [isCleared, setIsCleared] = useState(false);

  // ────────────────────────────────────
  // Reanimated: 全消去エフェクト用
  // ────────────────────────────────────
  const clearScale = useSharedValue(1);
  const clearOpacity = useSharedValue(1);

  const triggerClearAnimation = useCallback(() => {
    // 拡大→収縮のバウンシーなクリアエフェクト
    clearScale.value = withSequence(
      withSpring(1.05, { damping: 4, stiffness: 300 }),
      withSpring(1.0, { damping: 12, stiffness: 200 })
    );
    clearOpacity.value = withSequence(
      withTiming(0.6, { duration: 80 }),
      withTiming(1.0, { duration: 200 })
    );
    runOnJS(triggerRevealHaptic)();
    onRevealed?.();
  }, [clearScale, clearOpacity, onRevealed]);

  const clearAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clearScale.value }],
    opacity: clearOpacity.value,
  }));

  // ────────────────────────────────────
  // ストロークをパスとして確定・面積更新
  // ────────────────────────────────────
  const commitCurrentPath = useCallback(
    (closedPath: SkPath, allPaths: SkPath[]) => {
      if (isCleared) return;

      // 面積計算（60fps の描画スレッドを避けて JS スレッドで実行）
      const ratio = calcRevealedRatio(allPaths, CANVAS_SIZE);
      onProgress?.(ratio);

      if (ratio >= REVEAL_THRESHOLD) {
        // 全消去: ダート层を完全非表示にする
        setIsCleared(true);
        setPaths([]); // パス不要に
        triggerClearAnimation();
      }
    },
    [isCleared, onProgress, triggerClearAnimation]
  );

  // ────────────────────────────────────
  // ジェスチャーハンドラー
  // ────────────────────────────────────
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      if (isCleared) return;
      const p = Skia.Path.Make();
      // 太い筆（丸いキャップ）で開始
      p.moveTo(e.x, e.y);
      currentPathRef.current = p;
      runOnJS(setCurrentPath)(p.copy()); // Skia Pathはmutable→コピーしてReactに渡す
    })
    .onUpdate((e) => {
      if (isCleared || !currentPathRef.current) return;

      // ハプティクス（UIスレッド → JSスレッドへ）
      runOnJS(triggerScratchHaptic)(e.velocityX, e.velocityY);

      // Catmull-Rom風の滑らか曲線: cubicTo
      currentPathRef.current.lineTo(e.x, e.y);
      runOnJS(setCurrentPath)(currentPathRef.current.copy());
    })
    .onEnd(() => {
      if (isCleared || !currentPathRef.current) return;
      const finished = currentPathRef.current;
      currentPathRef.current = null;
      runOnJS(setCurrentPath)(null);
      runOnJS(setPaths)((prev) => {
        const next = [...prev, finished];
        // 面積計算は非同期で
        setTimeout(() => commitCurrentPath(finished, next), 0);
        return next;
      });
    });

  // ────────────────────────────────────
  // レンダリング
  // ────────────────────────────────────
  return (
    <GestureHandlerRootView style={styles.root}>
      <Animated.View style={[styles.canvasWrapper, clearAnimStyle]}>
        {/* ── 背景: キラキラ「賞品」レイヤー ── */}
        <View style={styles.prizeLayer} pointerEvents="none">
          {prizeContent ?? <DefaultPrize />}
        </View>

        {/* ── Skia Canvas: 汚れ & スクラッチ ── */}
        <GestureDetector gesture={panGesture}>
          <Canvas style={StyleSheet.absoluteFill}>
            {!isCleared && (
              <Group>
                {/* SaveLayer: 汚れ全体をひとつのレイヤーに */}
                <Group layer>
                  {/* 汚れ本体（グラデーション）*/}
                  <Rect x={0} y={0} width={CANVAS_SIZE} height={CANVAS_SIZE}>
                    <LinearGradient
                      start={vec(0, 0)}
                      end={vec(CANVAS_SIZE, CANVAS_SIZE)}
                      colors={[COLORS.dirtTop, COLORS.dirtBottom]}
                    />
                  </Rect>

                  {/* DST_OUT ブレンドで穴を開ける */}
                  <Group blendMode="clear">
                    {/* 確定済みストローク */}
                    {paths.map((p, i) => (
                      <Path
                        key={i}
                        path={p}
                        color="white"
                        style="stroke"
                        strokeWidth={SCRATCH_RADIUS * 2}
                        strokeCap="round"
                        strokeJoin="round"
                      />
                    ))}
                    {/* 現在描いているストローク */}
                    {currentPath && (
                      <Path
                        path={currentPath}
                        color="white"
                        style="stroke"
                        strokeWidth={SCRATCH_RADIUS * 2}
                        strokeCap="round"
                        strokeJoin="round"
                      />
                    )}
                  </Group>
                </Group>

                {/* キラキラ粒子エフェクト（スクラッチ跡に表示）*/}
                {paths.length > 0 && (
                  <SparkleOverlay paths={paths} size={CANVAS_SIZE} />
                )}
              </Group>
            )}
          </Canvas>
        </GestureDetector>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

// ──────────────────────────────────────────────────────────────
// キラキラ粒子オーバーレイ（スクラッチ跡をより華やかに）
// ──────────────────────────────────────────────────────────────
function SparkleOverlay({
  paths,
  size,
}: {
  paths: SkPath[];
  size: number;
}) {
  // パスの終点付近にランダムな輝き粒子を配置
  const sparkles = React.useMemo(() => {
    const pts: { x: number; y: number; r: number; color: string }[] = [];
    const sparkColors = [
      COLORS.sparkle,
      COLORS.prizeGlow,
      COLORS.prizeShine,
      COLORS.holographic,
    ];

    for (const p of paths) {
      const bounds = p.getBounds();
      // バウンズ内に数個の輝き
      for (let i = 0; i < 4; i++) {
        pts.push({
          x: bounds.x + Math.random() * bounds.width,
          y: bounds.y + Math.random() * bounds.height,
          r: 1.5 + Math.random() * 3,
          color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        });
      }
    }
    return pts.slice(0, 120); // 最大120粒
  }, [paths]);

  return (
    <Group blendMode="screen" opacity={0.85}>
      {sparkles.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.r} color={s.color} />
      ))}
    </Group>
  );
}

// ──────────────────────────────────────────────────────────────
// デフォルト「賞品」ビュー（ホログラフィック背景）
// ──────────────────────────────────────────────────────────────
function DefaultPrize() {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Fill>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(CANVAS_SIZE, CANVAS_SIZE)}
          colors={[
            COLORS.prizeGlow,
            COLORS.holographic,
            COLORS.prizeShine,
            COLORS.sparkle,
          ]}
        />
      </Fill>
      {/* 中央の大きな輝き */}
      <Circle
        cx={CANVAS_SIZE / 2}
        cy={CANVAS_SIZE / 2}
        r={CANVAS_SIZE * 0.3}
        color={COLORS.sparkle}
        opacity={0.6}
      />
      <Circle
        cx={CANVAS_SIZE / 2}
        cy={CANVAS_SIZE / 2}
        r={CANVAS_SIZE * 0.15}
        color="white"
        opacity={0.9}
      />
    </Canvas>
  );
}

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  canvasWrapper: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 24,
    overflow: "hidden",
    // ジェリー感を演出するシャドウ
    shadowColor: COLORS.holographic,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  prizeLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
  },
});
