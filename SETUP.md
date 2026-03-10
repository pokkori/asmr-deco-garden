# セットアップ手順

## 1. Expo プロジェクト作成

```bash
npx create-expo-app ASMRデコガーデン --template blank-typescript
cd ASMRデコガーデン
```

## 2. 依存パッケージのインストール

```bash
npx expo install @shopify/react-native-skia
npx expo install react-native-gesture-handler
npx expo install react-native-reanimated
npx expo install expo-haptics
npx expo install expo-av
```

## 3. app.json に追加

```json
{
  "expo": {
    "plugins": [
      [
        "expo-av",
        { "microphonePermission": false }
      ]
    ]
  }
}
```

## 4. babel.config.js に Reanimated プラグインを追加

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // ← 必須・最後に追加
  };
};
```

## 5. App.tsx に GestureHandlerRootView を追加

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ScratchScreen } from './components/ScratchScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScratchScreen />
    </GestureHandlerRootView>
  );
}
```

## 6. 起動

```bash
npx expo start
```

---

## ファイル構成

```
components/
  ScratchCanvas.tsx   ← Skia 磨きアクション（メイン）
  ScratchScreen.tsx   ← 使用例画面
hooks/
  useScratchProgress.ts ← 80%検知・ぷにっアニメーション
```

## 次のステップ（実装予定）

- [ ] `CollectionScreen` — タップ収集 + シャリーン音
- [ ] `DecoGardenScreen` — ドラッグ&ドロップ配置
- [ ] FTUE（初回体験: 指アイコンのガイドアニメーション）
- [ ] `useDecoGarden` — 配置アイテムの状態管理
- [ ] expo-av で ASMR 音源再生
