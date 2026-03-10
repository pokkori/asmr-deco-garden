/**
 * constants/items.ts
 * アイテム定義 — スクラッチで出現するキラキラアイテム全種
 */

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface ItemDef {
  id: string;
  emoji: string;
  label: string;       // 読み上げ・アクセシビリティ用
  rarity: Rarity;
  /** デコ配置時のデフォルトサイズ (px) */
  defaultSize: number;
  /** 収集時の効果音ファイル名 (assets/sounds/ 以下) */
  sound: string;
}

export const ITEMS: ItemDef[] = [
  // ── Common ──────────────────────────────────────
  { id: "flower_pink",  emoji: "🌸", label: "さくら",     rarity: "common",    defaultSize: 56, sound: "collect_common.wav" },
  { id: "flower_white", emoji: "🌼", label: "ひまわり",   rarity: "common",    defaultSize: 56, sound: "collect_common.wav" },
  { id: "star_yellow",  emoji: "⭐", label: "ほし",       rarity: "common",    defaultSize: 52, sound: "collect_common.wav" },
  { id: "heart_red",    emoji: "❤️", label: "はーと",     rarity: "common",    defaultSize: 52, sound: "collect_common.wav" },
  { id: "mushroom",     emoji: "🍄", label: "きのこ",     rarity: "common",    defaultSize: 56, sound: "collect_common.wav" },
  { id: "leaf",         emoji: "🍀", label: "よつば",     rarity: "common",    defaultSize: 52, sound: "collect_common.wav" },

  // ── Rare ────────────────────────────────────────
  { id: "gem_blue",     emoji: "💎", label: "ほうせき",   rarity: "rare",      defaultSize: 60, sound: "collect_rare.wav" },
  { id: "rainbow",      emoji: "🌈", label: "にじ",       rarity: "rare",      defaultSize: 72, sound: "collect_rare.wav" },
  { id: "butterfly",    emoji: "🦋", label: "ちょうちょ", rarity: "rare",      defaultSize: 64, sound: "collect_rare.wav" },
  { id: "star_shoot",   emoji: "🌠", label: "ながれぼし", rarity: "rare",      defaultSize: 68, sound: "collect_rare.wav" },

  // ── Epic ────────────────────────────────────────
  { id: "unicorn",      emoji: "🦄", label: "ゆにこーん", rarity: "epic",      defaultSize: 80, sound: "collect_epic.wav" },
  { id: "crystal",      emoji: "🔮", label: "まほうだま", rarity: "epic",      defaultSize: 72, sound: "collect_epic.wav" },
  { id: "crown",        emoji: "👑", label: "おうかん",   rarity: "epic",      defaultSize: 68, sound: "collect_epic.wav" },

  // ── Legendary ───────────────────────────────────
  { id: "dragon",       emoji: "🐉", label: "ドラゴン",   rarity: "legendary", defaultSize: 96, sound: "collect_legendary.wav" },
  { id: "phoenix",      emoji: "🔥", label: "ほのお",     rarity: "legendary", defaultSize: 88, sound: "collect_legendary.wav" },
];

/** レアリティ別の出現確率 */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  common:    60,
  rare:      28,
  epic:      10,
  legendary:  2,
};

/** ランダム抽選 */
export function drawRandomItem(): ItemDef {
  const total = Object.values(RARITY_WEIGHT).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  const rarities = Object.keys(RARITY_WEIGHT) as Rarity[];
  let targetRarity: Rarity = "common";
  for (const r of rarities) {
    roll -= RARITY_WEIGHT[r];
    if (roll <= 0) { targetRarity = r; break; }
  }
  const pool = ITEMS.filter((i) => i.rarity === targetRarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** レアリティ別カラー */
export const RARITY_COLOR: Record<Rarity, string> = {
  common:    "#A0A0C0",
  rare:      "#60A0FF",
  epic:      "#C060FF",
  legendary: "#FFD700",
};
