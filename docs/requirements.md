# Requirements

## 機能要件
### 認証・認可
- ログイン機能、セッション管理、ロール管理、ルートガードは実装されていない。
- Web、Docs、Desktop、Mobile いずれも認証前提の分岐や認可チェックは確認できない。
- したがって現状は、認証不要で利用できるシングルユーザー前提の構成である。

### 主要機能一覧（ルートベース）
- Mobile ルーティング（Bottom Tabs）
  - Home: カテゴリ別のタスク一覧表示、ローディング表示、空状態表示、エラー表示。
  - AddTask: タスク登録、カテゴリ選択、カテゴリ追加/削除、開始日・終了日設定、日付整合性バリデーション、登録後の遷移選択。
  - Calendar: 月次カレンダー表示、日別予定件数表示、日付ごとの予定一覧表示、当日ジャンプ。
  - AddTask タブはタブバー上のボタンを隠し、Home からの導線で遷移する実装。
- Web（Next.js App Router）
  - /: テンプレートベースの単一ページ。
- Docs（Next.js App Router）
  - /: テンプレートベースの単一ページ。
- Desktop（Electron + Next.js）
  - /: Desktop 向け単一ページ（UI コンポーネント表示、ビルド日時表示）。

### 外部連携
- HTTP API 連携基盤
  - packages/core の createApiClient により GET/POST の fetch 呼び出しが可能。
  - 通信失敗時は error と status=500 を返す共通レスポンス形式を採用。
  - 現時点でアプリ側からの実利用は確認できず、将来利用を見据えた基盤実装の段階。
- モバイルデータ連携
  - expo-sqlite によるローカル SQLite 永続化。
  - @react-native-async-storage/async-storage による補助ストレージ利用。
  - Platform 判定で Web は AsyncStorage リポジトリ、ネイティブは SQLite リポジトリを利用する抽象化あり。
- プラットフォーム連携
  - Electron preload で contextBridge 経由の IPC 連携 API を公開。
- デプロイ連携
  - Web/Docs は vercel.json により Vercel ビルド設定を定義。

## 非機能要件
### パフォーマンス
- Monorepo ビルド最適化
  - Turborepo により build/lint/check-types の依存タスクを管理し、ビルド成果物キャッシュを利用。
  - dev/dev:ios/dev:android はキャッシュ無効・persistent 設定で開発体験を優先。
- フロントエンド最適化
  - Next.js App Router 構成。
  - next/font/local によるローカルフォント最適化読み込み（Web/Docs）。
  - next/image を使用（優先読み込み指定あり）。
- モバイル体験
  - Home/Calendar でローディングインジケータを実装し、非同期読み込み中の体感品質を確保。

### セキュリティ
- Desktop（Electron）
  - BrowserWindow で nodeIntegration: false、contextIsolation: true を設定。
  - preload スクリプト経由で限定的に IPC を公開。
- Web/Docs
  - 外部リンクに rel="noopener noreferrer" を付与。
- 認証・認可
  - 未実装のため、アカウント保護や権限制御は現時点の要件に含まれない。
- データ保護
  - モバイルは端末ローカル保存（SQLite/AsyncStorage）中心で、送信先 API への機密データ転送実装は未確認。

### 国際化（i18n）
- i18n フレームワーク（next-intl、react-intl 等）や多言語ルーティング設定は未実装。
- Mobile では date/time 表示に ja-JP ロケール指定があり、日本語 UI 文言が実装されている。
- Web/Docs/Desktop の html lang は en で、文言は英語テンプレート中心。
- したがって現状は、アプリごとに言語運用が混在しており、統一された多言語対応基盤は未整備。
