# Android ビルド手順書

Android アプリのビルド方法を、用途に応じて 3 つのシナリオに分けて説明します。

| シナリオ | 用途 | EAS接続 | コンパイル場所 |
| --- | --- | --- | --- |
| **1. EAS Build + Expo デバッグ** | ネイティブモジュールを含む開発ビルドで、Metro に繋いで高速に開発する | あり(クラウドビルド) | EASのクラウド |
| **2. EAS 連携ローカルビルドで APK 出力** | EAS管理の署名鍵・設定を使いつつ、ビルド時間を消費せず手元でAPKを作る | あり(認証情報のみ) | 手元のマシン |
| **3. 完全ローカルで APK 出力** | ネットワーク接続なしでAPKを作る、EASアカウント不要 | なし | 手元のマシン |

## 前提条件(共通)

### Node.js / pnpm

`package.json` の `engines` と `packageManager` に合わせて、以下を使用してください。

- Node.js: `>=18`
- pnpm: `9.0.0`

```bash
node --version
pnpm --version
```

pnpm が未インストールの場合は、Corepack 経由で有効化できます。

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
```

### Android Studio / Android SDK

Android Studio をインストールし、初回起動時のセットアップを完了してください。
SDK Manager で以下をインストールします。

- SDK Platform: Android SDK Platform 36
- SDK Tools: Build-Tools / Platform-Tools / Command-line Tools / Emulator / SDK Tools / NDK / CMake

`ANDROID_HOME` を `~/.zshrc` に設定します。

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

```bash
source ~/.zshrc
adb version
```

環境変数を使わない場合は、`apps/mobile/android/local.properties` に SDK パスを書きます(このファイルは prebuild 後に生成される `apps/mobile/android/` 配下にあるため、事前に用意しても prebuild で上書きされます)。

```bash
sdk.dir=/Users/<ユーザー名>/Library/Android/sdk
```

### リポジトリのセットアップ

```bash
git clone https://github.com/transcode001/milkbox.git
cd milkbox
pnpm install
```

### EAS へのログイン(シナリオ1・2で必要)

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli whoami
```

グローバルに `eas-cli` を入れる場合:

```bash
pnpm add -g eas-cli
eas login
```

ログイン後、必ずプロジェクト設定の整合性を確認してください。`apps/mobile/app.json` の `slug` と、`extra.eas.projectId` が指す EAS 上のプロジェクトの slug が一致していないと、以降のコマンドはすべて失敗します。

```bash
cd apps/mobile
pnpm dlx eas-cli project:info
```

エラーが出た場合は `apps/mobile/app.json` の `slug` を EAS 上の登録値に合わせてください(アプリの表示名は `name` フィールドで管理されており、`slug` とは独立しているため、`slug` を変更してもホーム画面上のアプリ名には影響しません)。

### ネイティブプロジェクト(android/)について

このプロジェクトは Expo の managed workflow を採用しており、`apps/mobile/android/` は **コミットしません**(`apps/mobile/.gitignore` で除外)。ビルドのたびに `expo prebuild` で `apps/mobile/app.json` から再生成する運用です。過去に一度このディレクトリをコミットしてしまったことがありますが、署名鍵の混入・バージョン管理の二重化・iOS とのワークフロー非対称化などの問題が起きたため撤回されています。`android/` を手動で編集した場合、次の prebuild で変更が失われるので注意してください。

---

## シナリオ1: EAS Build(クラウド)でビルド＆Expo でデバッグ

ネイティブモジュールを含むビルドを作ったうえで、JS 側は Metro 経由でホットリロードしながら開発したい場合に使います。

> **注意**: 2026-08-02 時点、本リポジトリの `apps/mobile/eas.json` には dev-client 向けの `development` プロファイルが定義されておらず、`expo-dev-client` パッケージも未導入です。以下の手順1・2で対応します。

1. `expo-dev-client` を導入する(未導入の場合)

   ```bash
   cd apps/mobile
   npx expo install expo-dev-client
   ```

2. `apps/mobile/eas.json` に `development` プロファイルを追加する(未整備の場合)

   ```json
   "development": {
     "developmentClient": true,
     "distribution": "internal",
     "android": { "buildType": "apk" }
   }
   ```

3. クラウドでビルドする(`--local` を付けない = EAS のクラウドビルダーを使用、ビルドクレジットを消費)

   ```bash
   cd apps/mobile
   pnpm dlx eas-cli build --platform android --profile development
   ```

4. ビルド完了後に表示される URL または QR コードから APK をダウンロードし、実機/エミュレータにインストールする

5. Metro を起動する

   ```bash
   npx expo start --dev-client
   ```

6. インストールしたアプリを起動すると、自動的に Metro に接続される。以降 JS/TS の変更はホットリロードで反映され、ネイティブ側(依存パッケージ追加など)を変更した場合のみ手順1〜3を再実行する

---

## シナリオ2: EAS へ接続してAPK出力(ハイブリッド・ローカルビルド)

EAS 管理下の署名鍵・環境変数・プロジェクト設定は使いつつ、実際のコンパイル(gradle)は手元のマシンで行い、EAS のビルドクレジットを消費しない方法です。今回の内部配布用 APK 作成で実際に使用した手順です。

1. **必ず `apps/mobile` ディレクトリで実行する**(リポジトリルートで実行すると、ルートに誤って空の `eas.json` が生成されてしまう)

   ```bash
   cd apps/mobile
   ```

2. Android SDK の環境変数を指定してビルドを実行する

   ```bash
   ANDROID_HOME="$HOME/Library/Android/sdk" \
   ANDROID_SDK_ROOT="$HOME/Library/Android/sdk" \
   PATH="$HOME/Library/Android/sdk/platform-tools:$PATH" \
   pnpm dlx eas-cli build --platform android --profile android-apk --local --non-interactive
   ```

   ルートスクリプトを使う場合:

   ```bash
   pnpm build:mobile:android:apk -- --local
   ```

   Google Play 向け App Bundle(AAB)が欲しい場合:

   ```bash
   pnpm build:mobile:android:store -- --local
   ```

3. ビルド中、ログに以下が表示されることを確認する(EAS 管理の署名鍵が使われている証跡)

   ```text
   ✔ Using remote Android credentials (Expo server)
   ✔ Using Keystore from configuration: Build Credentials ...
   ```

4. 出力される APK / AAB を確認する

   ```text
   apps/mobile/build-<timestamp>.apk
   ```

   `apps/mobile/.gitignore` に `*.apk` を追加済みのため、生成物は自動的に Git 管理対象外になる。

---

## シナリオ3: 完全ローカルでAPK出力(EAS不使用)

EAS アカウント・ネットワーク接続なしで APK を作りたい場合の方法です。署名鍵もローカルで自前管理します。

### ネイティブプロジェクトの生成(prebuild)

```bash
cd apps/mobile
npx expo prebuild --platform android
```

prebuild の再実行が必要なケース:

- `apps/mobile/app.json` の Android 設定を変更した場合
- Expo config plugin を追加・削除・更新した場合
- ネイティブモジュールの追加など、Android ネイティブ設定に影響する依存関係を変更した場合
- `apps/mobile/android/` を削除して再生成したい場合

prebuild の再実行が不要なケース:

- `apps/mobile/src/` 配下の JS / TS / TSX のみを変更した場合
- 画面文言やスタイルのみを変更した場合
- Metro で反映できるアプリロジックのみを変更した場合

### debug APK のビルドと実機インストール

```bash
cd apps/mobile/android
./gradlew assembleDebug
```

出力先: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

```bash
adb devices
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
# 複数デバイス接続時
adb -s <device-id> install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Development Build で JS を読み込む場合は Metro を起動する。

```bash
cd apps/mobile
npx expo start --dev-client
```

### release APK のビルド

prebuild 直後の `apps/mobile/android/app/build.gradle` は、release ビルドもコミット対象外の `debug.keystore`(パスワード等が公開情報)で署名する設定になっています。**社外配布や本番相当のビルドには使わないでください。** 自前の署名鍵に切り替える手順は以下の通りです。

#### 1. キーストアを生成する(初回のみ)

```bash
cd apps/mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore milkbox-release.keystore -alias milkbox-release -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. `gradle.properties` に署名情報を追加する

`apps/mobile/android/gradle.properties` に追記:

```properties
MYAPP_UPLOAD_STORE_FILE=milkbox-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=milkbox-release
MYAPP_UPLOAD_STORE_PASSWORD=<store-password>
MYAPP_UPLOAD_KEY_PASSWORD=<key-password>
```

#### 3. `build.gradle` に署名設定を追加する

`apps/mobile/android/app/build.gradle` の `android.signingConfigs` と `android.buildTypes.release` を更新:

```groovy
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file(MYAPP_UPLOAD_STORE_FILE)
        storePassword MYAPP_UPLOAD_STORE_PASSWORD
        keyAlias MYAPP_UPLOAD_KEY_ALIAS
        keyPassword MYAPP_UPLOAD_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

`apps/mobile/android/` は prebuild のたびに再生成されるため、この設定は再度 prebuild すると失われます。恒常的に使う場合は config plugin 化を検討してください。

#### 4. release APK をビルドする

```bash
cd apps/mobile/android
./gradlew assembleRelease
```

出力先: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`

キーストアファイルは秘密情報です。`apps/mobile/android/` 自体は `.gitignore` で除外済みですが、誤ってネイティブプロジェクトをコミットする運用に変える場合は、少なくとも以下を `.gitignore` に追加してください。

```gitignore
apps/mobile/android/app/*.keystore
apps/mobile/android/app/*.jks
```

---

## トラブルシューティング

| エラー | 原因 | 対処 |
| --- | --- | --- |
| `SDK location not found` | `ANDROID_HOME` 未設定 または `apps/mobile/android/local.properties` 欠如 | 環境変数 or `apps/mobile/android/local.properties` を設定 |
| `cd: no such file or directory: android` | prebuild 未実行 | `npx expo prebuild --platform android` を実行 |
| `Missing build profile in eas.json: "..."` / 意図しない `eas.json` が生成される | `apps/mobile` 以外のディレクトリ(リポジトリルートなど)で `eas-cli` を実行した | 必ず `apps/mobile` ディレクトリに移動してから実行。誤生成された `eas.json` は削除する |
| `Project config: Slug for project identified by "extra.eas.projectId" (...) does not match the "slug" field (...)` | `apps/mobile/app.json` の `slug` と、EAS 上に登録済みのプロジェクトの slug が不一致 | `app.json` の `slug` を EAS 上の値に合わせるか、EAS ダッシュボードで登録側の slug を変更する |
| expo-notifications が Expo Go で動作しない | Expo Go は expo-notifications 非対応(SDK 53 以降) | Development Build(debug APK)を使用する |

---

## 参考: `apps/mobile/eas.json` のビルドプロファイル

| プロファイル | distribution | buildType | 用途 |
| --- | --- | --- | --- |
| `android-apk` | internal | apk | 社内配布用APK(シナリオ2で使用) |
| `android-store` | store | app-bundle | Google Play 提出用AAB |
| `store` | store | app-bundle | 全プラットフォーム一括のストア提出 |
| `ios-simulator` | internal | - | iOSシミュレータ用 |
| `ios-device` | internal | - | iOS実機用(内部配布) |
| `ios-store` | store | - | App Store 提出用 |

---
<!-- last reviewed: 2026-08-02 -->
