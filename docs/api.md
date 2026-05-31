# API 仕様

## 認証
- リポジトリ内に認証ヘッダー付与（Bearer Token 等）やログイン連携の実装は確認できない。
- `createApiClient` は `Authorization` ヘッダーを付与しておらず、認証要否は呼び出し側で別途実装する前提。
- したがって現状コードベースでは、API クライアント層としての認証要件は未定義。

## エンドポイント一覧
| メソッド | パス | 認証 | 概要 |
|---|---|---|---|
| GET | `{baseUrl}{endpoint}` | 未定義（クライアントで認証処理なし） | 任意エンドポイントへ GET リクエストし、JSON を `ApiResponse<T>` で返却 |
| POST | `{baseUrl}{endpoint}` | 未定義（クライアントで認証処理なし） | 任意エンドポイントへ JSON ボディで POST し、JSON を `ApiResponse<T>` で返却 |

## GET `{baseUrl}{endpoint}`
### リクエスト
- 実装関数: `createApiClient(baseUrl).get<T>(endpoint)`
- パラメータ
  - `baseUrl: string`
  - `endpoint: string`
- クエリパラメータ
  - 専用の型定義・組み立て処理なし。
  - 必要な場合は `endpoint` 文字列に手動で付与する設計。
- ヘッダー
  - 明示指定なし（`fetch` のデフォルト挙動）
- ボディ
  - なし

### レスポンス
- 型: `Promise<ApiResponse<T>>`
- 正常時
  - `data: T`（`response.json()` の結果）
  - `status: number`（HTTP ステータス）
  - `error`: なし
- 例外時（通信失敗など）
  - `data: null as any`
  - `status: 500`
  - `error: string`（`Error.message` または `"Unknown error"`）
- 備考
  - `response.ok` 判定は行っていないため、4xx/5xx でも JSON パースが成功すれば正常系と同形式で返す。

### 呼び出し元
- 実コード上の呼び出し箇所: なし
- 参照例（ドキュメントのみ）
  - `packages/core/README.md`
  - `SETUP.md`

## POST `{baseUrl}{endpoint}`
### リクエスト
- 実装関数: `createApiClient(baseUrl).post<T>(endpoint, body)`
- パラメータ
  - `baseUrl: string`
  - `endpoint: string`
  - `body: unknown`
- ヘッダー
  - `Content-Type: application/json`
- ボディ
  - `JSON.stringify(body)`
  - ボディ型は `unknown` で、実行時バリデーションは未実装。

### レスポンス
- 型: `Promise<ApiResponse<T>>`
- 正常時
  - `data: T`（`response.json()` の結果）
  - `status: number`（HTTP ステータス）
  - `error`: なし
- 例外時（通信失敗など）
  - `data: null as any`
  - `status: 500`
  - `error: string`
- 備考
  - GET と同様に `response.ok` 判定は未実装。

### 呼び出し元
- 実コード上の呼び出し箇所: なし
- 参照例（ドキュメントのみ）
  - `packages/core/README.md`

## 補足（調査結果）
- OpenAPI / Swagger ファイル
  - `openapi*.json|yaml|yml`, `swagger*.json|yaml|yml` はリポジトリ内に存在しない。
- 環境変数
  - API ベースURL向けの `VITE_API_URL`, `REACT_APP_API_URL`, `NEXT_PUBLIC_*` などの参照は確認できない。
  - `process.env` の利用は `apps/desktop/src/main.ts` の `NODE_ENV` 判定のみで、API には未使用。
