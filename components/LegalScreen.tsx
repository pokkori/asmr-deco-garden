/**
 * components/LegalScreen.tsx
 * ──────────────────────────────────────────────────────────────
 * 法的情報画面
 * - プライバシーポリシー
 * - 利用規約
 * - 特定商取引法に基づく表記
 * ──────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ──────────────────────────────────────────────────────────────
// 法的コンテンツ定義
// ──────────────────────────────────────────────────────────────

type LegalSection = {
  title: string;
  content: string;
};

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: "収集する情報",
    content:
      "本アプリは、アプリの機能向上のために以下の情報を端末内に保存します：\n" +
      "・ゲームの進行データ（インベントリ・ガーデン配置）\n" +
      "・ログインボーナスの履歴（連続ログイン日数）\n" +
      "・初回チュートリアル完了フラグ\n\n" +
      "これらのデータは端末内のAsyncStorageにのみ保存され、外部サーバーへの送信は行いません。",
  },
  {
    title: "プッシュ通知",
    content:
      "本アプリはデイリーボーナスのリマインダーとしてプッシュ通知を送信する場合があります。" +
      "通知の許可はいつでも端末の設定から変更できます。",
  },
  {
    title: "第三者サービス",
    content:
      "本アプリはExpoCLIおよびReact Nativeを使用して開発されています。" +
      "これらのフレームワークが収集する情報については、各サービスのプライバシーポリシーをご参照ください。",
  },
  {
    title: "お問い合わせ",
    content:
      "プライバシーに関するご質問は、アプリストアのサポートページよりお問い合わせください。",
  },
];

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: "利用条件",
    content:
      "本アプリ「ひみつのデコ・ガーデン」は、個人の娯楽目的でのみご利用いただけます。" +
      "商業目的での利用、リバースエンジニアリング、改変は禁止します。",
  },
  {
    title: "コンテンツ",
    content:
      "本アプリ内のすべてのグラフィック・音源・テキストの著作権は開発者に帰属します。" +
      "無断転載・二次配布は禁止します。",
  },
  {
    title: "免責事項",
    content:
      "本アプリの利用により生じたいかなる損害についても、開発者は責任を負いかねます。" +
      "アプリのデータはOSのアップデートや端末の初期化により失われる場合があります。",
  },
  {
    title: "改定",
    content:
      "利用規約はアプリのアップデートに伴い変更される場合があります。" +
      "変更後も引き続きアプリをご利用いただいた場合、改定後の規約に同意したものとみなします。",
  },
];

const TOKUTEI_SECTIONS: LegalSection[] = [
  { title: "販売者", content: "本アプリ開発者" },
  { title: "所在地", content: "お問い合わせいただいた場合に遅滞なく開示いたします" },
  { title: "連絡先", content: "アプリストアのサポートページよりお問い合わせください" },
  { title: "販売価格", content: "無料（アプリ内課金なし）" },
  { title: "支払方法", content: "該当なし（無料アプリ）" },
  { title: "返品・キャンセル", content: "デジタルコンテンツの性質上、返金は原則承っておりません" },
];

// ──────────────────────────────────────────────────────────────
// セクションコンポーネント
// ──────────────────────────────────────────────────────────────

function LegalSectionItem({ section }: { section: LegalSection }) {
  return (
    <View
      style={styles.section}
      accessibilityLabel={`${section.title}：${section.content}`}
      accessibilityRole="text"
    >
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionContent}>{section.content}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// タブコンテンツ
// ──────────────────────────────────────────────────────────────

type Tab = "privacy" | "terms" | "tokutei";

const TABS: { id: Tab; label: string }[] = [
  { id: "privacy", label: "プライバシー" },
  { id: "terms",   label: "利用規約" },
  { id: "tokutei", label: "特商法" },
];

// ──────────────────────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────────────────────

interface LegalScreenProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export function LegalScreen({ visible, onClose, initialTab = "privacy" }: LegalScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const sections =
    activeTab === "privacy"
      ? PRIVACY_SECTIONS
      : activeTab === "terms"
      ? TERMS_SECTIONS
      : TOKUTEI_SECTIONS;

  const tabTitle =
    activeTab === "privacy"
      ? "プライバシーポリシー"
      : activeTab === "terms"
      ? "利用規約"
      : "特定商取引法に基づく表記";

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      accessibilityViewIsModal
    >
      <View
        style={styles.root}
        accessibilityLabel="法的情報画面"
      >
        {/* ヘッダー */}
        <View
          style={styles.header}
          accessibilityRole="header"
        >
          <Text style={styles.headerTitle} accessibilityRole="header">
            {tabTitle}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityLabel="法的情報画面を閉じる"
            accessibilityRole="button"
          >
            <Text style={styles.closeBtnText}>X</Text>
          </Pressable>
        </View>

        {/* タブ切り替え */}
        <View
          style={styles.tabBar}
          accessibilityRole="tablist"
          accessibilityLabel="法的情報タブ"
        >
          {TABS.map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityLabel={`${tab.label}タブ`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === tab.id }}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* コンテンツ */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          accessibilityLabel={`${tabTitle}の内容`}
        >
          {sections.map((section, idx) => (
            <LegalSectionItem key={idx} section={section} />
          ))}
          <Text style={styles.lastUpdated} accessibilityRole="text">
            最終更新日：2024年1月
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1A1030",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,160,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFD6EC",
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(200,160,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E8D6FF",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(200,160,255,0.2)",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#C060FF",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(200,160,255,0.5)",
  },
  tabTextActive: {
    color: "#C060FF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(200,160,255,0.2)",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#E8D6FF",
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    color: "#C0A8E0",
    lineHeight: 22,
  },
  lastUpdated: {
    fontSize: 12,
    color: "rgba(200,160,255,0.4)",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
});
