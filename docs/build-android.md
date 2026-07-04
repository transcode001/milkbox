# ローカル Android ビルド手順

## 前提条件

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

### Android Studio

Android Studio をインストールし、初回起動時のセットアップを完了してください。

### Android SDK

Android Studio の SDK Manager で以下をインストールしてください。

- SDK Platform
  - Android SDK Platform 36
- SDK Tools
  - Android SDK Build-Tools
  - Android SDK Platform-Tools
  - Android SDK Command-line Tools
  - Android Emulator
  - Android SDK Tools
  - NDK
  - CMake

`ANDROID_HOME` を `~/.zshrc` に設定します。

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

設定を反映します。

```bash
source ~/.zshrc
adb version
```

環境変数を使わない場合は、`apps/mobile/android/local.properties` に SDK パスを書きます。

```bash
sdk.dir=/Users/<ユーザー名>/Library/Android/sdk
```

## 初回セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/transcode001/milkbox.git
cd milkbox

# 依存パッケージのインストール
pnpm install
```

## ネイティブプロジェクトの生成(prebuild)

`apps/mobile/android/` が存在しない場合は、Expo の prebuild で Android ネイティブプロジェクトを生成します。

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

## debug APK のビルドと実機インストール

### debug APK をビルドする

```bash
cd apps/mobile/android
./gradlew assembleDebug
```

出力先:

```bash
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### 接続デバイスを確認する

```bash
adb devices
```

### 単一デバイスへインストールする

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### 複数デバイスから指定してインストールする

```bash
adb -s <device-id> install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

### Metro を起動する

Development Build で JS を読み込む場合は、`apps/mobile` で Metro を起動します。

```bash
cd apps/mobile
npx expo start --dev-client
```

## release APK のビルド

### キーストアを生成する(初回のみ)

```bash
cd apps/mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore milkbox-release.keystore -alias milkbox-release -keyalg RSA -keysize 2048 -validity 10000
```

### gradle.properties に署名情報を追加する

`apps/mobile/android/gradle.properties` に以下を追加します。

```bash
MYAPP_UPLOAD_STORE_FILE=milkbox-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=milkbox-release
MYAPP_UPLOAD_STORE_PASSWORD=<store-password>
MYAPP_UPLOAD_KEY_PASSWORD=<key-password>
```

### build.gradle に署名設定を追加する

`apps/mobile/android/app/build.gradle` の `android.signingConfigs` と `android.buildTypes.release` を本番署名用に更新します。

```bash
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

### release APK をビルドする

```bash
cd apps/mobile/android
./gradlew assembleRelease
```

出力先:

```bash
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

キーストアは秘密情報です。`apps/mobile/.gitignore` で `apps/mobile/android/` は除外されていますが、ネイティブプロジェクトをコミットする運用に変える場合は、`.gitignore` に少なくとも以下を追加してください。

```bash
apps/mobile/android/app/*.keystore
apps/mobile/android/app/*.jks
```

## ルートスクリプトを使ったビルド(EAS Local Build)

EAS Local Build を使う場合は、EAS CLI のインストールまたは `pnpm dlx eas-cli`、Expo へのログインが必要です。

```bash
pnpm dlx eas-cli login
pnpm dlx eas-cli whoami
```

グローバルに入れる場合:

```bash
pnpm add -g eas-cli
eas login
```

`package.json` には以下の Android 用ルートスクリプトがあります。

- `build:mobile:android:apk`
- `build:mobile:android:store`

ローカルで APK を作る場合:

```bash
pnpm build:mobile:android:apk -- --local
```

ローカルで Google Play 向け App Bundle を作る場合:

```bash
pnpm build:mobile:android:store -- --local
```

`build:mobile:android:apk` は `apps/mobile/eas.json` の `android-apk` profile を使い、APK を生成します。`build:mobile:android:store` は `android-store` profile を使い、AAB を生成します。

## トラブルシューティング

| エラー                                     | 原因                                                                     | 対処                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| `SDK location not found`                   | `ANDROID_HOME` 未設定 または `apps/mobile/android/local.properties` 欠如 | 環境変数 or `apps/mobile/android/local.properties` を設定 |
| `cd: no such file or directory: android`   | prebuild 未実行                                                          | `npx expo prebuild --platform android` を実行             |
| expo-notifications が Expo Go で動作しない | Expo Go は expo-notifications 非対応(SDK 53 以降)                        | Development Build(debug APK)を使用する                    |

---
<!-- last reviewed: 2026-07-05 -->
