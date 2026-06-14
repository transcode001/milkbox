---
# CalendarScreen 画面仕様

## 概要
登録済みタスクを月間カレンダー上で日付別に可視化する画面。  
選択日の予定一覧を表示し、前月/次月移動と今日への復帰操作を提供する。

## アクセス権限
- 認証・認可チェックは実装されていない。
- ルートガードなしで BottomTab の Calendar ルートにアクセス可能。
- 表示条件は `DatabaseProvider` 初期化完了のみ。

## 表示データ
- `visibleMonth`
  - 型: Date
  - 取得元: 画面内 state（初期値: 当日）
- `selectedDate`
  - 型: Date
  - 取得元: 画面内 state（初期値: 当日）
- `items: SavedItem[]`
  - 型: `SavedItem[]`
  - 取得元: `itemRepository.findAllWithCategory()`
- `rangeItems: SavedItem[]`
  - 型: `SavedItem[]`
  - 取得元: useMemo（startDate と endDate を持つ複数日タスク）
- `weekdayItems: SavedItem[]`
  - 型: `SavedItem[]`
  - 取得元: useMemo（weekdays を持つ曜日繰り返しタスク）
- `weekdayBarItems: SavedItem[]`
  - 型: `SavedItem[]`
  - 取得元: useMemo（カテゴリ単位で曜日を集約した Gantt バー表示用データ）
- `pointItemsByDate: Map<string, SavedItem[]>`
  - 型: `Map<YYYY-MM-DD, SavedItem[]>`
  - 取得元: useMemo（単日タスクを日付キーでグループ化）
- `categoryColorMap: Map<string | undefined, number>`
  - 型: `Map<categoryName, colorIndex>`
  - 取得元: useMemo（カテゴリ名に対してカラーインデックスを割り当て）
- `selectedItems: SavedItem[]`
  - 型: `SavedItem[]`
  - 取得元: rangeItems・weekdayItems・pointItemsByDate から selectedDate に合致するものを合算して時刻順ソート
- `loading`, `errorMessage`
  - 型: boolean / string | null
  - 取得元: 画面内 state

## UI 構成
- SafeAreaView
  - 状態表示分岐
    - Loading: ActivityIndicator
    - Error: Text
    - Data: ScrollView
      - 月ヘッダー
        - 前月ボタン
        - 当月ラベル
        - 次月ボタン
      - 曜日ヘッダー行
      - カレンダー本体（週ブロック単位）
        - 6週 x 7日の日付セル（Pressable）
          - 単日タスクがある日はドット表示
        - Gantt バー表示エリア（rangeItems・weekdayBarItems を週内に配置）
          - 週をまたぐバーは端で切れ、continuesLeft/continuesRight で角丸制御
          - 複数バーが重なる場合はレーン分割（assignLanes）
      - 予定ヘッダー
        - 選択日タイトル
        - 今日へボタン
      - 予定リスト
        - Empty 状態
        - 予定カード（時刻、カテゴリバッジ（カテゴリ色）、本文、期間表示または曜日表示）

## ユーザー操作
- 月移動
  - トリガー: `前月` / `次月` ボタン
  - 処理内容: `visibleMonth` を ±1 ヶ月更新
  - 遷移先: なし
- 日付選択
  - トリガー: 日付セルタップ
  - 処理内容: `selectedDate` 更新、下部予定リスト更新
  - 遷移先: なし
- 今日へ復帰
  - トリガー: `今日へ` ボタン
  - 処理内容: `visibleMonth` と `selectedDate` を当日に設定
  - 遷移先: なし
- 画面フォーカス時再読込
  - トリガー: 画面再表示（`useFocusEffect`）
  - 処理内容: `loadItems()` 実行
  - 遷移先: なし

## API 呼び出し
- HTTP API 呼び出し: なし
- ローカルデータアクセス
  - 呼び出し: `itemRepository.findAllWithCategory()`
  - メソッド/エンドポイント: N/A（ローカル SQLite クエリ）
  - レスポンス概要: `SavedItem[]`

## 状態管理
- `useState`
  - `visibleMonth`, `selectedDate`, `items`, `loading`, `errorMessage`
- `useCallback`
  - `loadItems`, `moveMonth`
- `useFocusEffect`
  - フォーカス時に `loadItems()` 実行
- `useMemo`
  - `rangeItems / weekdayItems / weekdayBarItems / pointItemsByDate / categoryColorMap`（アイテム種別ごとに分類）
  - `monthGrid`（6x7カレンダー配列）
  - `selectedItems`（選択日に合致するアイテムを全種別から集約して時刻ソート）
- Context
  - `useDatabaseManager()` で repository 利用

## バリデーション・エラー
- 入力バリデーション
  - 入力フォームはなく、明示的バリデーションはなし
- データ整形ルール
  - カテゴリ指定なし（noCategoryChecked）で startDate/endDate が両方ないデータはカレンダー表示対象外
  - カテゴリ指定あり（曜日モード）のデータは weekdays に基づき Gantt バーに表示
  - rangeItems は startDate〜endDate の範囲にわたって表示
  - pointItemsByDate は startDate（なければ endDate）の単日に表示
  - 時刻表示は `ja-JP` ロケールで整形、日付のみの値は `終日` 表示
- エラー表示
  - 読込失敗時に `errorMessage = "予定の読み込みに失敗しました"` を表示
  - `console.error` に詳細ログ出力

## 備考・補足
1. この画面の主な目的
- 登録済みタスクを月間カレンダー上で時系列に可視化し、日付単位で予定密度を把握すること。
- 選択日の予定詳細を表示し、その日の実行計画を確認しやすくすること。

2. この画面を使う主なユーザー
- 期限や開始日を軸に予定を管理したいユーザー。
- 登録済みタスクの「いつ実行するか」を日別に見たいユーザー。

3. コードから読み取れる隠れたビジネスルール
- `startDate`/`endDate` が未設定の項目はカレンダーに出さない（AddTask で未設定保存した項目は対象外）。
- 表示時刻は `startDate` 優先、次に `endDate`、最後に `date` を参照する優先順位で決まる。
- 日付文字列に時刻が含まれない場合は「終日」扱いとして表示する。
- 選択日内の予定は時刻昇順で並べる。
- カテゴリ色はカテゴリ名を hashColorIdx でハッシュ化し、BAR_COLORS（7色）の中から自動割り当てされる。
- 週をまたぐ Gantt バーは週末/週頭で切り、continuesLeft/Right フラグで視覚的な連続性を表現する。
- Gantt バーが同一週内で重なる場合は assignLanes アルゴリズムでレーンを分割して描画する。
- 選択日の予定リストには rangeItems（期間内）・weekdayItems（曜日一致）・pointItems（単日一致）の全種別が合算表示される。

4. 将来的に追加予定の機能
- README の `Scheduler pairing (planned)` に沿って、外部カレンダーとの同期表示・双方向更新が追加される可能性がある。
- 現在は閲覧専用寄りのため、将来的にカレンダー上での直接編集やドラッグ操作などが拡張候補。

5. 他画面との関係・遷移フローで特記すべきこと
- データ入力は AddTask が担い、Calendar は可視化に特化した役割分担。
- AddTask でカテゴリ指定あり（曜日モード）で登録したサブタスクは Gantt バーに表示される。カテゴリ指定なし（日付モード）で開始日/終了日のないサブタスクはカレンダーに出ないため、両画面の件数が一致しない場合がある。
- 画面フォーカス時に再読込するため、他画面で更新後に Calendar を開くと最新状態になる。
---
