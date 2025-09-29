# slack-messenger

Slack メッセージ送信・一斉配信用の TypeScript 製 CLI ツールです。単一チャンネルへの投稿、複数チャンネルへのブロードキャスト、設定ファイルに定義したチャンネル一覧の表示を行えます。メッセージは直接引数で与えるか、Markdown / プレーンテキストファイルから読み込めます。

## 特徴

- Node.js (>= 22) / TypeScript 製、単一バイナリ不要の軽量 CLI
- `send-message` / `broadcast` / `list-channels` の 3 コマンド
- YAML で複数のチャンネルリストを管理
- メッセージファイル読み込み (`-F, --message-file`)
- Dry-run モードで送信前に内容確認
- 同時並列数やリトライ回数の調整
- Verbose ログ / ログレベル制御
- Slack Bot Token は `--token` か `SLACK_BOT_TOKEN` 環境変数

## インストール / セットアップ

```powershell
# 依存関係インストール
yarn install

# tsx で直接実行 (ビルド不要 / 開発向け)
yarn start -- --help
yarn start send-message C1234567890 "Hello"

# dist を生成したい場合 (パッケージ化 / 実行速度計測 等)
yarn build
node dist/main.js --help

# 旧ラッパースクリプト (自動ビルド挙動を再利用したい場合)
yarn start:legacy send-message C1234567890 "Hello from legacy"
```

Node.js 22 以上が必要です。現在 `yarn start` は `tsx src/main.ts` を直接実行します。旧方式 (`scripts/start.cjs`) は `yarn start:legacy` に移行しました。

## 環境変数

| 変数名            | 用途                       | 必須     | 備考                           |
| ----------------- | -------------------------- | -------- | ------------------------------ | ------- | ---- | ------------------------------- |
| `SLACK_BOT_TOKEN` | Slack Bot User OAuth Token | 条件付き | `--token` を付けない場合に使用 |
| `SLACK_LOG_LEVEL` | 既定ログレベル (`debug     | info     | warn                           | error`) | 任意 | オプション `--log-level` が優先 |

`.env` を利用する場合はルートに配置し、`dotenv` により自動読込されます。

```env
SLACK_BOT_TOKEN=xoxb-xxxxxxxx
SLACK_LOG_LEVEL=info
```

## コマンド概要

### 1. 単一チャンネルへ送信: send-message

```
slack-messenger send-message <channel-id> [message...]
```

例:

```powershell
# シンプルな送信
yarn start send-message C1234567890 "デプロイ完了しました"

# メッセージファイル (Markdown 可)
yarn start send-message C1234567890 -F ./messages/test1.md

# トークンを明示指定
yarn start send-message C1234567890 "Hello" --token %SLACK_BOT_TOKEN%
```

主なオプション:

- `-F, --message-file <path>`: ファイルから本文読込 (位置引数 message を省略可)
- `-v, --verbose`: 追加ログ出力
- `-t, --token <token>`: 環境変数を上書き
- `--timeout <ms>`: タイムアウト (既定 10000)
- `--retries <count>`: API リトライ回数 (既定 3)

### 2. 複数チャンネルへ一斉送信: broadcast

```
slack-messenger broadcast <channel-list> [message...]
```

`<channel-list>` は YAML 設定内で定義した `name`。例:

```yaml
# channels.yaml
channel_lists:
  - name: 'test'
    description: 'Channels for development team'
    channels:
      - C09HERT8BFA
      - C09GFMCJSLT
```

送信例:

```powershell
# test リストに一斉送信
yarn start broadcast test "本日のリリースが完了しました"

# ファイル読み込み + カスタム設定ファイル
yarn start broadcast test -F ./messages/test1.md --config ./channels.yaml

# Dry-run (実際には送信せず内容と対象を表示)
yarn start broadcast test "リリース予定" --dry-run

# 並列数とリトライ調整
yarn start broadcast test "通知" --max-concurrency 3 --max-retries 2
```

主なオプション:

- `-c, --config <path>`: 設定 YAML パス (既定 `./channels.yaml`)
- `-F, --message-file <path>`: ファイルから本文読込
- `--dry-run`: 実送信せずに結果プレビュー
- `--max-concurrency <count>`: 並列送信数 (既定 5)
- `--max-retries <count>`: チャンネル単位のリトライ (既定 3)
- 共通: `-t, --token`, `-v, --verbose`, `--timeout`, `--log-level`

### 3. 定義済みチャンネル一覧表示: list-channels

```
slack-messenger list-channels
```

例:

```powershell
# 既定ファイルから一覧表示
yarn start list-channels

# JSON 形式
yarn start list-channels --format json

# 別ファイル & YAML 形式
yarn start list-channels --config ./test-config.yml --format yaml
```

オプション:

- `-c, --config <path>`: 設定ファイル
- `-f, --format <table|json|yaml>`: 出力形式 (既定 table)

## メッセージファイル

`-F` / `--message-file` で指定したファイルは UTF-8 として読み込まれ、前後の余分な空白を調整した上で 1〜2000 文字の長さを検証します。Markdown 記法はそのまま Slack に送信され、Slack 側で解釈されます。

例: `messages/test1.md`

```markdown
_test_
@takezoux2(竹下)

- list1
- list2
```

## 返却コード (Exit Code) の目安

| 状態                                          | コード             |
| --------------------------------------------- | ------------------ |
| 正常終了                                      | 0                  |
| バリデーション / 入力エラー                   | 1                  |
| Slack API などの一部失敗 (リトライ後失敗含む) | 2 〜 10 (将来拡張) |
| 想定外の内部エラー                            | 99                 |

※ 現時点で細かいコード体系は段階的に整備中です。

## エラーハンドリング概要

- CLI パースエラー: 標準エラー出力にメッセージ後、コード 1
- バリデーションエラー (空メッセージ / チャンネル ID 形式不正など): 詳細表示
- 送信処理中の例外: コンテキスト付きでエラー整形後出力

## 開発 (コントリビュート) 方法

```powershell
yarn install
# 型チェック + Lint
yarn lint
# テスト (Vitest)
yarn test
# ウォッチ開発
yarn dev
```

PR 作成前に以下を推奨:

- テスト追加 / 既存テスト成功 (`yarn test`)
- Lint & フォーマット (`yarn lint`, `yarn format`)

## ライセンス

MIT

## 使用例まとめ (クイックリファレンス)

```powershell
# 単一送信
yarn start send-message C1234567890 "Hello"
# ファイル送信
yarn start send-message C1234567890 -F ./msg.md
# ブロードキャスト
yarn start broadcast test "Deploy 完了"
# Dry-run
yarn start broadcast test "Deploy" --dry-run
# チャンネル一覧
yarn start list-channels --format json
```

## 今後の改善予定

- エグジットコードの粒度細分化
- Slack レート制限時のより高度なバックオフ
- テンプレート変数展開 (例: リリースバージョン差し込み)
- 標準入力 (stdin) からのメッセージ読み込み

---

ご意見・改善提案歓迎です。Issue / PR お待ちしています。
