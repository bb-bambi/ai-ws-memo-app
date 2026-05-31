# ファイル構成図

## 全体構成

```
ai-ws-memo-app/
├── backend/          # サーバーサイド（Express + Knex + PostgreSQL）
├── frontend/         # クライアントサイド（React + Vite）
├── render.yaml       # Renderへのデプロイ設定
├── .gitignore        # Gitの管理対象外ファイルの設定
├── bug.md            # バグ一覧
└── attack.md         # 攻撃手法と対策
```

---

## バックエンド（`backend/`）

```
backend/
├── src/
│   ├── index.js              # サーバーのエントリーポイント
│   ├── routes/
│   │   └── notes.js          # ノートのAPI定義
│   └── db/
│       ├── knex.js           # DB接続インスタンス
│       ├── knexfile.js       # DB接続設定
│       └── migrations/
│           └── 20240101_create_notes.js  # テーブル作成
├── .env                      # 環境変数（ローカル用・Git管理外）
├── .env.example              # 環境変数のサンプル
└── package.json              # 依存パッケージ・コマンド定義
```

### 各ファイルの役割

| ファイル | 役割 |
|---|---|
| `src/index.js` | Expressサーバーを起動する。CORSやJSONの設定を行い、APIルートを登録する |
| `src/routes/notes.js` | ノートのCRUD（作成・読取・更新・削除）を担うAPIを定義する。GET / POST / PUT / DELETE の5つのエンドポイントを持つ |
| `src/db/knex.js` | Knexのインスタンスを作成してエクスポートする。`routes/notes.js` がこれをインポートしてDBを操作する |
| `src/db/knexfile.js` | 開発環境・本番環境それぞれのDB接続情報を定義する。`DATABASE_URL` 環境変数を読み込む |
| `src/db/migrations/20240101_create_notes.js` | `notes` テーブルを作成するマイグレーションファイル。`npm run migrate` で実行される |
| `.env` | `DATABASE_URL` や `PORT` などの環境変数を定義する。パスワードを含むためGitには含めない |
| `.env.example` | `.env` のひな形。新しいメンバーが環境構築する際の参考にする |
| `package.json` | `express` / `knex` / `pg` などの依存関係と `npm run dev` などのコマンドを定義する |

### APIエンドポイント一覧

| メソッド | パス | 処理内容 |
|---|---|---|
| GET | `/api/notes` | 全ノートを更新日時の降順で取得 |
| GET | `/api/notes/:id` | 指定IDのノートを1件取得 |
| POST | `/api/notes` | 新しいノートを作成 |
| PUT | `/api/notes/:id` | 指定IDのノートを更新 |
| DELETE | `/api/notes/:id` | 指定IDのノートを削除 |

---

## フロントエンド（`frontend/`）

```
frontend/
├── index.html                # アプリのHTMLテンプレート
├── vite.config.js            # Viteのビルド・開発サーバー設定
├── package.json              # 依存パッケージ・コマンド定義
└── src/
    ├── main.jsx              # Reactのエントリーポイント
    ├── App.jsx               # 画面全体のレイアウト
    ├── App.css               # 全コンポーネントのスタイル
    ├── index.css             # グローバルスタイル（変数・リセット）
    ├── api/
    │   └── notes.js          # バックエンドAPIの呼び出し関数
    ├── hooks/
    │   └── useNotes.js       # ノートのデータ管理ロジック
    └── components/
        ├── Sidebar.jsx       # 左側のノートリスト全体
        ├── NoteCard.jsx      # ノートカード1枚分
        └── NoteEditor.jsx    # 右側のノート編集エリア
```

### 各ファイルの役割

| ファイル | 役割 |
|---|---|
| `index.html` | アプリの土台となるHTML。`<div id="root">` にReactが描画される |
| `vite.config.js` | 開発サーバーのプロキシ設定（`/api` → `localhost:3001`）とReactプラグインを設定する |
| `src/main.jsx` | `App.jsx` を `<div id="root">` にマウントするReactの起動処理 |
| `src/App.jsx` | 左（Sidebar）と右（NoteEditor）の2カラムレイアウトを組み立てる。`useNotes` フックからデータを受け取り各コンポーネントに渡す |
| `src/App.css` | サイドバー・カード・エディタなど全コンポーネントのCSSをまとめて定義する |
| `src/index.css` | フォント・背景色・スクロールバーなどのグローバルなスタイルとCSS変数（カラーテーマ）を定義する |
| `src/api/notes.js` | `fetch` を使ってバックエンドAPIを呼び出す関数（`fetchNotes` / `createNote` / `updateNote` / `deleteNote`）をまとめる |
| `src/hooks/useNotes.js` | ノートの一覧・選択中ノート・自動保存タイマーなどの状態管理ロジックをまとめたカスタムフック。`App.jsx` が使う |
| `src/components/Sidebar.jsx` | 左パネル全体。ヘッダー・検索ボックス・ノートカードの一覧を表示する |
| `src/components/NoteCard.jsx` | サイドバーに並ぶノートカード1枚分。タイトル・本文の冒頭・更新日時・削除ボタンを表示する |
| `src/components/NoteEditor.jsx` | 右パネルのノート編集エリア。タイトル入力欄・本文テキストエリアを持ち、入力のたびに `onSave` を呼んで600ms後に自動保存する |

### データの流れ

```
ユーザー操作
    ↓
App.jsx（レイアウト）
    ↓ useNotes フック経由でデータを受け取る
    ├── Sidebar.jsx
    │       └── NoteCard.jsx × n枚
    └── NoteEditor.jsx
            ↓ 入力があるたびに
        useNotes.js（状態管理）
            ↓ 600ms後に自動保存
        api/notes.js（API呼び出し）
            ↓ fetch
        Express API（backend）
            ↓ Knex
        PostgreSQL（DB）
```

---

## ルートの設定ファイル

| ファイル | 役割 |
|---|---|
| `render.yaml` | Renderへのデプロイ設定。バックエンド（Webサービス）・フロントエンド（静的配信）・PostgreSQL（DB）の3つのサービスをまとめて定義する |
| `.gitignore` | `node_modules/` や `.env`（パスワード含む）をGitの管理対象から除外する |
