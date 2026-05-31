# Vision

## プロダクト概要
**Milkbox** は、カテゴリと日付を軸にタスクを整理・管理できるマルチプラットフォームのタスク管理プロダクトです。  
モバイル（React Native + Expo）を中心に、Web・Desktop へ展開する構成になっています。

## 課題・背景
- タスクが増えると、カテゴリごとの整理と日付ベースの把握が同時に必要になる。
- 既存実装では「カテゴリ管理」「開始日/終了日の設定」「カレンダー表示」を備えており、単純なメモではなく予定管理まで扱いたいニーズがある。
- README に `Scheduler pairing (planned)` の記載があり、将来的にスケジュール連携まで含めた利用シーンを想定している。
- README に Web/Desktop が `Under adjustment` とあるため、現時点ではモバイル中心で価値検証しつつ、順次チャネルを拡張する段階と推測できる。
- `CHANGELOG` は確認できなかったため、背景推定は README とアプリ実装（画面文言・ナビゲーション）を主根拠とした。

## ターゲットユーザー
- 日々のタスクや予定をカテゴリ別に整理したい個人ユーザー。
- 開始日/終了日を使って、期限や期間を意識して管理したいユーザー。
- モバイル中心で素早く登録し、必要に応じてカレンダーで俯瞰したいユーザー。

## 提供価値
- **カテゴリ単位の整理**: タスクをカテゴリでグルーピングして一覧化し、見通しを改善。
- **期間つき予定管理**: 開始日・終了日の入力、日付整合性チェック（終了日 < 開始日の防止）で入力品質を担保。
- **カレンダー可視化**: 月表示で件数把握、日付選択で当日の予定詳細を確認。
- **素早い登録フロー**: 追加後に「続けて登録」または「ホームへ戻る」を選べる導線。
- **カテゴリ運用の柔軟性**: カテゴリ追加/削除、削除時の「関連タスクも削除」または「未分類化」に対応。
- **クロスプラットフォーム展開**: モバイルで実用価値を作りつつ、Web/Desktop に同一ドメインを展開可能。

## 技術スタック
### 言語・基盤
- TypeScript 5.x
- Node.js 18+
- pnpm workspaces
- Turborepo

### フロントエンド / アプリ
- モバイル: React Native 0.81, Expo 54
- ナビゲーション: React Navigation（bottom tabs / native stack / stack）
- Web/Docs: Next.js 16, React 19, React DOM 19
- Desktop: Electron 33 + Next.js レンダラー, electron-builder

### データ・状態管理
- モバイル永続化: expo-sqlite（SQLite）
- 補助ストレージ: @react-native-async-storage/async-storage
- Repository パターン: `@milkbox/shared` の型/インターフェースを活用

### UI/入力補助
- @react-native-community/datetimepicker
- @react-native-picker/picker
- ルート依存として Chakra UI / Emotion / Framer Motion（Web 系 UI 拡張の土台）

### 品質・開発体験
- ESLint 9（monorepo 共通設定: `@repo/eslint-config`）
- Prettier 3
- TypeScript 型チェック（`check-types`）
- テスト（モバイル）: Jest, jest-expo, @testing-library/react-native

### 共有パッケージ
- `@milkbox/shared`: 共有型・リポジトリインターフェース
- `@repo/core`: 共通ロジック・API ユーティリティ
- `@repo/ui`: Web/Desktop 向け UI コンポーネント
- `@repo/typescript-config`: 共通 TypeScript 設定
