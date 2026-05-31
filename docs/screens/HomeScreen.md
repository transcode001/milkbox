---
# HomeScreen 画面仕様

## 概要
カテゴリ単位で登録済みタスクを一覧表示する画面。  
Add Task ボタンから新規登録画面へ遷移し、復帰時にもデータを再読込する。

## アクセス権限
- 認証・認可チェックは実装されていない。
- ルートガードなしで BottomTab の Home ルートにアクセス可能。
- 表示条件は `DatabaseProvider` の初期化完了のみ（初期化中は provider 側で画面非表示）。

## 表示データ
- `sections: CategorySection[]`
  - 型: `{ title: string; data: SavedItem[] }[]`
  - 取得元: `dbManager.itemRepository.findAllWithCategory()` の戻り値をカテゴリ名でグルーピング
- `SavedItem`
  - 型: `id: number, categoryId?: number, text: string, date: string, startDate?: string, endDate?: string, categoryName?: string`
  - 取得元: SQLite（`items` と `categories` の LEFT JOIN）
- `loading: boolean`
  - 型: boolean
  - 取得元: 画面内 `useState`（非同期読込状態）
- `errorMessage: string | null`
  - 型: string | null
  - 取得元: 画面内 `useState`（読込エラー時に設定）

## UI 構成
- SafeAreaView
  - Header（View）
    - Title（Text: Items by Category）
    - Add Task ボタン（TouchableOpacity）
  - 状態表示分岐
    - Loading: ActivityIndicator
    - Error: Text
    - Empty: Text（No items yet）
    - Data: SectionList
      - SectionHeader（カテゴリ名）
      - ItemRow
        - タスク本文
        - 開始日/終了日表示

## ユーザー操作
- Add Task へ遷移
  - トリガー: `Add Task` ボタン
  - 処理内容: `navigation.navigate("AddTask")`
  - 遷移先: AddTask 画面
- 画面フォーカス時の再読込
  - トリガー: 画面再表示（`useFocusEffect`）
  - 処理内容: `loadItems()` を実行して一覧更新
  - 遷移先: なし

## API 呼び出し
- HTTP API 呼び出し: なし
- ローカルデータアクセス
  - 呼び出し: `itemRepository.findAllWithCategory()`
  - メソッド/エンドポイント: N/A（ローカル SQLite クエリ）
  - レスポンス概要: `SavedItem[]`（カテゴリ名付き）

## 状態管理
- `useState`
  - `sections`: 画面表示用のカテゴリ別データ
  - `loading`: 読込中フラグ
  - `errorMessage`: エラーメッセージ
- `useEffect`
  - 初回マウントで `loadItems()`
- `useFocusEffect`
  - フォーカスごとに `loadItems()` 再実行
- Context
  - `useDatabaseManager()` で Repository にアクセス

## バリデーション・エラー
- 日付入力バリデーション: なし（表示専用画面）
- エラーハンドリング
  - データ読込失敗時に `errorMessage = "Failed to load items"`
  - UI にエラーテキストを表示
- 表示フォールバック
  - 日付不正値または未設定時は `-` を表示

## 備考・補足
1. この画面の主な目的
- 登録済みタスクをカテゴリ単位で素早く俯瞰し、現在の管理状況を把握すること。
- 次アクションとして AddTask へ遷移し、入力フローへ接続するハブとして機能すること。

2. この画面を使う主なユーザー
- 日々のタスクをカテゴリ別に整理して確認したい個人ユーザー。
- 追加・編集前に全体の登録状況を見たいユーザー。

3. コードから読み取れる隠れたビジネスルール
- 一覧はカテゴリ名でグルーピングされ、カテゴリ未設定データは常に「期間指定なし」セクションに寄せられる。
- 画面復帰時（フォーカス時）に自動再読込する前提で、他画面での更新結果を Home に反映する運用を想定している。
- 日付表示は開始日/終了日のみで、値が不正または未設定なら `-` を表示して壊れた表示を回避する。

4. 将来的に追加予定の機能
- README の `Scheduler pairing (planned)` に沿って、カテゴリ一覧と外部スケジュールの突合表示が追加される可能性が高い。
- 現在は閲覧中心のため、将来的に Home 上での検索・フィルタ・並べ替え・一括操作が拡張候補になりやすい。

5. 他画面との関係・遷移フローで特記すべきこと
- 初期ルートは Home で、ここから AddTask へ遷移して登録を行う。
- AddTask の登録・削除結果は Home のフォーカス再取得時に反映される。
- Calendar は日付ベース、Home はカテゴリベースのため、同一データを別視点で確認する関係にある。
---
