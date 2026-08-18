# AGENTS.md

Codex(および他のコーディングエージェント)がこのリポジトリで作業する際に読むコンテキストファイルです。

## プロジェクト概要

**Milkbox** は、カテゴリと日付を軸にタスクを整理・管理するマルチプラットフォームのタスク管理アプリです。モバイル(React Native + Expo)を中心に、Web / Desktop へ同一ドメインを展開しています。詳細は [`docs/vision.md`](docs/vision.md)・[`docs/requirements.md`](docs/requirements.md) を参照してください。認証機能は未実装で、現状はシングルユーザー前提です。

## リポジトリ構成

pnpm workspaces + Turborepo によるモノレポです。

```
apps/
  mobile/   React Native + Expo(Expo SDK 54, managed workflow)。EAS Build を使用
  desktop/  Electron + Next.js
  web/      Next.js(Vercel デプロイ)
  docs/     Next.js のドキュメントサイト(Vercel デプロイ)
packages/
  core/               @repo/core        共通ロジック・APIユーティリティ
  shared/             @milkbox/shared   共有の型・リポジトリインターフェース
  ui/                 @repo/ui          共有UIコンポーネント
  eslint-config/       @repo/eslint-config
  typescript-config/   @repo/typescript-config
docs/       ドキュメント(vision, requirements, api, build-android, screens/*)
```

## セットアップ・共通コマンド

```bash
pnpm install          # 依存関係のインストール(Node >=18, pnpm 9.0.0)
pnpm dev              # apps/* を並列起動
pnpm dev:mobile       # モバイル(Expo)
pnpm dev:web          # Web
pnpm dev:docs         # Docs
pnpm build            # turbo run build(mobile は build スクリプトを持たないため対象外)
pnpm lint             # turbo run lint(eslint --max-warnings 0)
pnpm check-types      # turbo run check-types(tsc --noEmit、web/docs は next typegen も実行)
pnpm test             # turbo run test(現状 jest を持つのは apps/mobile のみ)
```

**変更を完了とみなす前に、影響するパッケージで `pnpm lint` / `pnpm check-types` / `pnpm test` を実行して通ることを確認してください。** `.github/workflows/ci.yml` が同じコマンドをPRごとに実行します。

## モバイル(Android/iOS)固有の注意点

- `apps/mobile/android/` と `apps/mobile/ios/` は **絶対にコミットしないでください**(`apps/mobile/.gitignore` で除外、managed workflow)。ネイティブプロジェクトは `expo prebuild` でビルド時に都度生成します。過去に一度コミットしてしまい、署名鍵混入・バージョン管理の二重化などの問題が起きて撤回された経緯があります。
- Android ビルド手順(EASクラウド/EASローカル/完全ローカルの3パターン)は [`docs/build-android.md`](docs/build-android.md) に整理されています。ビルド関連の作業をする前に必ず参照してください。
- `apps/mobile/app.json` の `slug` を変更する場合、EAS 上の登録プロジェクトの slug と一致している必要があります(`pnpm dlx eas-cli project:info` で確認可能)。表示アプリ名は `name` フィールドで別管理です。
- `apps/mobile/eas.json` のプロファイル: `android-apk`(社内配布APK) / `android-store`・`store`(Play Store向けAAB) / `ios-simulator` / `ios-device` / `ios-store`。

## Web/Docs(Vercel)固有の注意点

- `apps/web`・`apps/docs` は `vercel.json` 経由で Vercel が自動デプロイします。ただし Vercel のビルドは `pnpm build --filter=<app>` のみを実行し、**lint・型チェック・テストはゲートしません**。品質担保は `pnpm lint` / `pnpm check-types` / `pnpm test`(CI)側の責務です。

## コミットメッセージ規約

`[種別] 概要` の形式(このリポジトリの `git log` を参照して踏襲してください)。

```
[feat] app title
[fix] address PR #36 review feedback on notification timing
[modify] introduce design tokens and fix review findings
[ci] add GitHub Actions CI and Android build docs
```

## 既知の制約(2026-08-09 時点)

- `apps/mobile` 以外(`apps/web`, `apps/docs`, `apps/desktop`, `packages/*`)にテストは存在しません。`pnpm test` は該当パッケージのみ実行し、他は自動的にスキップされます(エラーにはなりません)。
- `apps/mobile/eas.json` には dev-client 向けの `development` プロファイルが未定義、`expo-dev-client` パッケージも未導入です。
- CLAUDE.md はこのリポジトリに存在しません。エージェント固有の追加ルールがあれば、まずこのファイル(AGENTS.md)に追記してください。
