---
# AddTaskScreen 画面仕様

## 概要
タスクを新規登録し、カテゴリ管理と日付設定を行う入力画面。  
同画面下部で保存済みタスク一覧を確認・削除できる。

## アクセス権限
- 認証・認可チェックは実装されていない。
- ルートガードなしで BottomTab の AddTask ルートに遷移可能。
- タブバーからは直接表示されず、Home 画面から遷移する導線。

## 表示データ
- `text`
  - 型: string
  - 取得元: 画面内入力 state
- `items: CategorySection[]`
  - 型: `{ title: string; data: SavedItem[] }[]`
  - 取得元: `itemRepository.findAllWithCategory()` をカテゴリ名でグルーピング
- `categories: Category[]`
  - 型: `{ id: number; name: string }[]`
  - 取得元: `categoryRepository.findAll()`
- `selectedOption`
  - 型: string（カテゴリID文字列）
  - 取得元: categories 読込結果から初期選択設定
- `noCategoryChecked`
  - 型: boolean
  - 取得元: 画面内 state
- `newCategoryName`
  - 型: string
  - 取得元: モーダル入力 state
- `startDate`, `endDate`
  - 型: Date | null
  - 取得元: DatePicker 操作
- `activeDateField`
  - 型: "start" | "end" | null
  - 取得元: DatePicker 表示制御 state

## UI 構成
- SafeAreaView
  - Category 追加モーダル（Modal）
    - カテゴリ名 TextInput
    - キャンセル/追加ボタン
  - KeyboardAvoidingView
    - SectionList
      - ListHeader
        - カテゴリ選択エリア
          - 追加/削除ボタン
          - カテゴリ未指定チェックボックス
          - Picker
        - タスク入力フォーム
          - 本文 TextInput
          - 開始日/終了日セレクタ
          - DateTimePicker（表示時）
          - Submit ボタン
        - Saved Items 件数表示
      - SectionHeader（カテゴリ名）
      - ItemRow
        - 本文、登録日時
        - Delete ボタン
      - Empty 表示

## ユーザー操作
- タスク登録
  - トリガー: Submit ボタン
  - 処理内容: 入力検証後に `itemRepository.create()`、一覧再読込、完了ダイアログ表示
  - 遷移先: ダイアログで Home へ遷移可能
- カテゴリ追加
  - トリガー: `+ 追加` ボタン、モーダルの `追加`
  - 処理内容: `categoryRepository.create(newCategoryName)`、カテゴリ再読込
  - 遷移先: なし
- カテゴリ削除
  - トリガー: `削除` ボタン
  - 処理内容: 確認ダイアログで
    - `削除`: `itemRepository.deleteByCategoryId()` 後に `categoryRepository.delete()`
    - `未分類`: `itemRepository.clearCategoryByCategoryId()` 後に `categoryRepository.delete()`
  - 遷移先: なし
- カテゴリ未指定切替
  - トリガー: チェックボックス行タップ
  - 処理内容: `noCategoryChecked` 切替、Picker 無効化/有効化
  - 遷移先: なし
- 日付設定/クリア
  - トリガー: 開始日/終了日の設定ボタン、クリアボタン
  - 処理内容: DatePicker を開閉し、`startDate`/`endDate` を更新
  - 遷移先: なし
- 保存済みタスク削除
  - トリガー: 各行の Delete ボタン
  - 処理内容: `itemRepository.delete(id)`、一覧再読込
  - 遷移先: なし

## API 呼び出し
- HTTP API 呼び出し: なし
- ローカルデータアクセス（Repository）
  - `categoryRepository.findAll()`
  - `categoryRepository.create(name)`
  - `categoryRepository.delete(categoryId)`
  - `itemRepository.findAllWithCategory()`
  - `itemRepository.create(dto)`
  - `itemRepository.delete(id)`
  - `itemRepository.deleteByCategoryId(categoryId)`
  - `itemRepository.clearCategoryByCategoryId(categoryId)`
- メソッド/エンドポイント: N/A（ローカル SQLite）
- レスポンス概要: `Category[]`, `SavedItem[]`, 作成結果 `SavedItem`

## 状態管理
- `useState`
  - `text`, `items`, `selectedOption`, `noCategoryChecked`, `categories`
  - `showAddCategoryModal`, `newCategoryName`
  - `startDate`, `endDate`, `activeDateField`
- `useEffect`
  - 初回マウント時に `initDatabase()` 実行（カテゴリ・一覧読込）
- Context
  - `useDatabaseManager()` で item/category repository を利用
- レスポンシブ分岐
  - `useWindowDimensions()` で狭幅時レイアウト切替

## バリデーション・エラー
- バリデーション
  - 本文必須: 空文字は `Please enter some text`
  - 日付整合性: `isEndDateBeforeStartDate(startDate, endDate)` が true の場合は登録不可
  - カテゴリ選択必須: 未指定チェック OFF かつ未選択時は登録不可
  - カテゴリ名必須: 空文字でカテゴリ追加不可
- エラー表示
  - DB 読込/保存/削除失敗時は `Alert.alert` でエラーダイアログ表示
- 成功通知
  - 登録成功、カテゴリ追加成功、カテゴリ削除成功時も `Alert.alert` で通知

## 備考・補足
1. この画面の主な目的
- タスク登録を最短で完了させることに加え、カテゴリの作成・整理と日付設定を1画面で完結させること。
- 登録済みデータの即時確認と削除も同画面で行い、入力とメンテナンスを往復せずに運用できるようにすること。

2. この画面を使う主なユーザー
- 日々の予定やタスクをカテゴリ単位で管理したい個人ユーザー。
- 開始日/終了日を設定して、後続のカレンダー表示まで一貫して使いたいユーザー。
- UI 文言が日本語中心のため、初期想定は日本語話者ユーザー。

3. コードから読み取れる隠れたビジネスルール
- AddTask はタブバーから直接開けない。Home から遷移する前提で、誤タップ導線を避ける設計。
- カテゴリ削除時は「関連タスクを削除」か「未分類化」かを必ず選ばせ、データ消失方針を明示している。
- カテゴリ未指定チェックが ON の間はカテゴリ Picker を無効化し、入力矛盾を防ぐ。
- 登録時の `date` は必須のため、開始日/終了日未設定でも内部的に現在日時を補完して保存する。
- 終了日が開始日より前の入力は保存不可（入力時点で弾く）。

4. 将来的に追加予定の機能
- リポジトリ全体の README に `Scheduler pairing (planned)` があり、外部スケジューラ連携の追加が想定される。
- 現状はローカル保存中心のため、将来的には API 連携型の同期・共有機能へ拡張される余地がある（`@repo/core` の API クライアント基盤は実装済み）。

5. 他画面との関係・遷移フローで特記すべきこと
- 基本フローは Home → AddTask（登録）→ Home。
- 登録後ダイアログで「続けて登録」または「ホームへ戻る」を選べるため、連続投入と一覧確認の2導線を用意している。
- AddTask での登録・削除・カテゴリ変更は Home のカテゴリ一覧と Calendar の予定表示に反映される。
- Calendar 側では開始日/終了日のないデータを表示対象外にしているため、AddTask で日付未設定登録した項目はカレンダーには出ない。
---
