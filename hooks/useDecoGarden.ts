/**
 * hooks/useDecoGarden.ts
 * ──────────────────────────────────────────────────────────────
 * デコガーデン状態管理
 *
 * - 収集済みアイテム一覧 (inventory)
 * - 庭に配置済みアイテム (placedItems)
 * - 境界ガードレール付きドロップ
 * ──────────────────────────────────────────────────────────────
 */

import { useCallback, useReducer } from "react";
import { ItemDef } from "../constants/items";

// ──────────────────────────────────────────────────────────────
// 型
// ──────────────────────────────────────────────────────────────
export interface PlacedItem {
  uid: string;       // 配置ごとのユニークID
  itemId: string;
  emoji: string;
  size: number;
  x: number;        // 左上基準
  y: number;
  zIndex: number;
}

interface State {
  inventory: ItemDef[];          // 未配置の収集済みアイテム
  placed: PlacedItem[];
  nextZ: number;
}

type Action =
  | { type: "COLLECT"; item: ItemDef }
  | { type: "PLACE";   item: ItemDef; x: number; y: number; gardenW: number; gardenH: number }
  | { type: "MOVE";    uid: string;   x: number; y: number; gardenW: number; gardenH: number }
  | { type: "REMOVE";  uid: string }
  | { type: "BRING_FRONT"; uid: string };

// ──────────────────────────────────────────────────────────────
// 境界ガードレール
// ──────────────────────────────────────────────────────────────
const MARGIN = 8; // 画面端から何px以内に収める

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function guardBounds(
  x: number, y: number,
  size: number,
  gardenW: number, gardenH: number
): { x: number; y: number } {
  return {
    x: clamp(x, MARGIN, gardenW - size - MARGIN),
    y: clamp(y, MARGIN, gardenH - size - MARGIN),
  };
}

// ──────────────────────────────────────────────────────────────
// Reducer
// ──────────────────────────────────────────────────────────────
let _uidCounter = 0;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "COLLECT":
      return { ...state, inventory: [...state.inventory, action.item] };

    case "PLACE": {
      const pos = guardBounds(
        action.x - action.item.defaultSize / 2,
        action.y - action.item.defaultSize / 2,
        action.item.defaultSize,
        action.gardenW,
        action.gardenH
      );
      const placed: PlacedItem = {
        uid: `${action.item.id}_${++_uidCounter}`,
        itemId: action.item.id,
        emoji: action.item.emoji,
        size: action.item.defaultSize,
        ...pos,
        zIndex: state.nextZ,
      };
      // インベントリから1個消費（同IDの最初の1個）
      const idx = state.inventory.findIndex((i) => i.id === action.item.id);
      const newInventory =
        idx >= 0
          ? [...state.inventory.slice(0, idx), ...state.inventory.slice(idx + 1)]
          : state.inventory;
      return {
        ...state,
        inventory: newInventory,
        placed: [...state.placed, placed],
        nextZ: state.nextZ + 1,
      };
    }

    case "MOVE": {
      return {
        ...state,
        placed: state.placed.map((p) => {
          if (p.uid !== action.uid) return p;
          const pos = guardBounds(
            action.x, action.y,
            p.size,
            action.gardenW, action.gardenH
          );
          return { ...p, ...pos, zIndex: state.nextZ };
        }),
        nextZ: state.nextZ + 1,
      };
    }

    case "REMOVE":
      return {
        ...state,
        placed: state.placed.filter((p) => p.uid !== action.uid),
      };

    case "BRING_FRONT":
      return {
        ...state,
        placed: state.placed.map((p) =>
          p.uid === action.uid ? { ...p, zIndex: state.nextZ } : p
        ),
        nextZ: state.nextZ + 1,
      };

    default:
      return state;
  }
}

// ──────────────────────────────────────────────────────────────
// フック
// ──────────────────────────────────────────────────────────────
export function useDecoGarden() {
  const [state, dispatch] = useReducer(reducer, {
    inventory: [],
    placed: [],
    nextZ: 1,
  });

  const collectItem = useCallback((item: ItemDef) => {
    dispatch({ type: "COLLECT", item });
  }, []);

  const placeItem = useCallback(
    (item: ItemDef, x: number, y: number, gardenW: number, gardenH: number) => {
      dispatch({ type: "PLACE", item, x, y, gardenW, gardenH });
    },
    []
  );

  const moveItem = useCallback(
    (uid: string, x: number, y: number, gardenW: number, gardenH: number) => {
      dispatch({ type: "MOVE", uid, x, y, gardenW, gardenH });
    },
    []
  );

  const removeItem = useCallback((uid: string) => {
    dispatch({ type: "REMOVE", uid });
  }, []);

  const bringToFront = useCallback((uid: string) => {
    dispatch({ type: "BRING_FRONT", uid });
  }, []);

  return {
    inventory: state.inventory,
    placed: state.placed,
    collectItem,
    placeItem,
    moveItem,
    removeItem,
    bringToFront,
  };
}
