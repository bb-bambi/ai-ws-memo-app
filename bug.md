# バグ・問題点一覧

## 重大度: 高

### BUG-01: ノート切り替え時に未保存の変更が失われる（データロス）
**場所**: `frontend/src/hooks/useNotes.js:60`  
**原因**: `saveTimer` が単一の `useRef` で全ノートを共有している。ノートAを編集して600ms経過する前にノートBを編集すると、`clearTimeout` でノートAのタイマーがキャンセルされ、ノートAの変更がAPIに送信されずDBへ保存されない。

**実用上の発生確率について**: タイマーは入力のたびにリセットされるため、「ノートAで最後にキーを押してから0.6秒以内に、ノートBに切り替えてさらにキーを押す」という操作が必要。人間の操作速度では現実的にほぼ発生しない。コード上の設計の問題ではあるが、実害が出るケースは極めてまれ。重大度は**中〜低**に近い。

**再現手順**（タイミングが厳しいため再現困難）:
1. ブラウザで `http://localhost:5173` を開く
2. 左サイドバーからノートAを選択し、本文を連続入力する（入力を止める）
3. 入力を止めてから **0.6秒以内** に（かなり素早く）ノートBをクリックする
4. ノートBの本文をすぐにタイプする（この瞬間にノートAのタイマーがキャンセルされる）
5. 数秒待ってからノートAに戻る
6. ステップ2の入力内容が保存されていないことを確認する

**コードで問題を直接確認する方法**（確実）:
```js
// ブラウザの DevTools コンソールで、0.6秒より短い間隔で2回 saveNote を呼ぶ
// 実際にはUIで再現困難なため、コードを読んで設計上の欠陥として認識する
```

**修正方法**: `saveTimer` を `Map<noteId, timerId>` で管理し、ノートIDごとに独立したタイマーを持つ。
```js
// useNotes.js
const saveTimers = useRef(new Map());

const saveNote = useCallback((id, fields) => {
  setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...fields } : n)));

  if (saveTimers.current.has(id)) clearTimeout(saveTimers.current.get(id));
  saveTimers.current.set(id, setTimeout(async () => {
    saveTimers.current.delete(id);
    const updated = await api.updateNote(id, fields);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
  }, 600));
}, []);
```

---

### BUG-02: Renderデプロイ時にAPIリクエストが届かない（ローカル開発では発生しない）
**場所**: `frontend/src/api/notes.js:1`, `frontend/vite.config.js`  
**原因**: フロントエンドは `/api/notes` というパスをハードコードしており、Vite の `proxy` 設定で**開発時のみ**バックエンドへ転送している。ローカルの `npm run dev` では問題ないが、`npm run build` でビルドした静的ファイルにはプロキシが存在しないため、Render 上の静的ホスティングでは `/api/notes` がフロントエンドのオリジンに送られてしまい、APIサーバーに届かない。また `render.yaml` で `VITE_API_URL` 環境変数を定義しているが、フロントエンドのコードでその変数を使っていない。

**再現手順**:
1. `frontend/` ディレクトリで `npm run build` を実行する
2. ビルドされた `dist/` を静的サーバーで配信する（例: `npx serve dist -p 4173`）
3. バックエンドは `localhost:3001` で起動したまま（プロキシなしの状態）
4. ブラウザで `http://localhost:4173` を開く
5. アプリがノートを読み込めず「ノートがありません」またはエラーになることを確認する
6. ブラウザの DevTools → Network タブを開き、`/api/notes` へのリクエストが `localhost:4173/api/notes`（404）に飛んでいることを確認する

**実測値**: `curl http://localhost:4173/api/notes` → HTTP 404

**修正方法**: `api/notes.js` でベースURLを環境変数から取得するように変更し、`render.yaml` の `VITE_API_URL` にバックエンドのURLを設定する。
```js
// frontend/src/api/notes.js
const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/notes';
```
```yaml
# render.yaml — VITE_API_URL をバックエンドサービスのURLに設定
- key: VITE_API_URL
  value: https://memo-app-backend.onrender.com
```
これにより、開発時は `VITE_API_URL` が未定義なので `/api/notes`（Vite プロキシ経由）、本番では絶対URLが使われる。

---

### BUG-03: Renderデプロイ時に CORS が機能しない可能性がある（ローカル開発では発生しない）
**場所**: `render.yaml:14`  
**内容**: `FRONTEND_URL: https://memo-app-frontend.onrender.com` とハードコードされているが、Renderが実際に割り当てるURL（例: `memo-app-frontend-xxxx.onrender.com`）と一致しない場合がある。バックエンドの CORS 設定がこの値を参照しているため、URLが一致しないとブラウザからのリクエストがすべて CORS エラーになる。ローカル開発では CORS 設定が `http://localhost:5173` を許可しているため問題ない。

**再現手順**:
1. `render.yaml` をそのまま Render にデプロイする
2. Render ダッシュボードでフロントエンドサービスの実際の URL を確認する（`https://memo-app-frontend.onrender.com` 以外のURLが割り当てられる場合がある）
3. フロントエンドのURLをブラウザで開く
4. ブラウザの DevTools → Console に `Access-Control-Allow-Origin` に関する CORS エラーが表示されることを確認する
5. バックエンドの `FRONTEND_URL` 環境変数が実際のフロントエンドURLと一致していない場合に発生する

**ローカル疑似再現**:
```bash
# バックエンドを誤ったFRONTEND_URLで起動
FRONTEND_URL=https://wrong-url.example.com node src/index.js &
# 別Originからリクエストを送ると CORSエラーになる
curl -s -H "Origin: http://localhost:5173" \
  -I http://localhost:3001/api/notes | grep -i "access-control"
# Access-Control-Allow-Origin ヘッダーが返らないことを確認
```

**修正方法**: `render.yaml` の `FRONTEND_URL` を静的な値ではなく、Renderデプロイ後に手動で正しいURLを設定するか、`fromService` を使って動的に取得する。
```yaml
# render.yaml
- key: FRONTEND_URL
  fromService:
    name: memo-app-frontend
    type: web
    property: host  # Renderが割り当てた実際のホスト名が入る
```

---

## 重大度: 中

### BUG-04: DBエラーメッセージがそのままクライアントに返される（情報漏洩）
**場所**: `backend/src/routes/notes.js:10, 20, 30, 44, 54`  
**内容**: `catch` ブロックで `err.message` をそのままJSONで返しているため、SQL文の内容（テーブル名・カラム名・型情報）がクライアントに漏洩する。

**再現手順**:

パターンA（255文字超のタイトル）:
```bash
LONG=$(python3 -c "print('あ'*256)")
curl -s -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"$LONG\",\"content\":\"test\"}"
```
→ `{"error":"insert into \"notes\" (\"content\", \"title\") values ($1, $2) returning * - value too long for type character varying(255)"}` が返る

パターンB（文字列ID）:
```bash
curl -s http://localhost:3001/api/notes/abc
```
→ `{"error":"select * from \"notes\" where \"id\" = $1 limit $2 - invalid input syntax for type integer: \"abc\""}` が返る

**修正方法**: `catch` ブロックで汎用メッセージを返し、詳細はサーバー側のログにのみ出力する。
```js
// backend/src/routes/notes.js — 全 catch ブロックを統一
} catch (err) {
  console.error(err); // サーバーログにのみ詳細を出力
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
}
```

---

### BUG-05: 空文字タイトルがデフォルト値を回避してDBに保存される
**場所**: `backend/src/routes/notes.js:26`  
**内容**: `const { title = '無題' } = req.body` はJavaScriptのデフォルト値代入であり、`undefined` のときのみ適用される。`title: ""` を送ると空文字のままDBに保存される。フロントエンドでタイトルを全部消してもAPIには空文字が送られる。

**再現手順**:

APIで直接確認:
```bash
curl -s -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"","content":"テスト"}'
```
→ `"title": ""` で保存される（「無題」にならない）

UIで確認:
1. ブラウザでアプリを開く
2. ノートを選択し、エディタ右のタイトル欄のテキストをすべて削除する（Backspace で全消去）
3. 600ms 待つ（自動保存）
4. ページをリロードする
5. 左サイドバーのノートカードのタイトルが空白になっていることを確認する

**修正方法**: デフォルト値代入ではなく `||` で明示的にフォールバックする。
```js
// backend/src/routes/notes.js:26
const title = req.body.title || '無題';
const content = req.body.content ?? '';
```

---

### BUG-06: 非整数IDへのアクセスで500エラーになる（4xx が正しい）
**場所**: `backend/src/routes/notes.js:14-22`  
**内容**: `/api/notes/abc` のような文字列IDを渡すと、DBがパースエラーを返し 500 Internal Server Error になる。正しくは 400 Bad Request を返すべきで、IDが整数かどうかのバリデーションがない。

**再現手順**:
```bash
# 文字列ID → 500
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/notes/abc
# → 500

# 小数 → 500
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/notes/1.5
# → 500
```

**実測値**: 文字列ID・小数IDともに HTTP 500 が返る

**修正方法**: 各ルートの先頭でIDが正の整数かチェックし、不正な場合は 400 を返す。
```js
// backend/src/routes/notes.js — /:id を持つルートの先頭に追加
const id = Number(req.params.id);
if (!Number.isInteger(id) || id <= 0) {
  return res.status(400).json({ error: '無効なIDです' });
}
```

---

### BUG-07: PUTリクエストで `title`/`content` を省略すると `updated_at` だけ更新される
**場所**: `backend/src/routes/notes.js:34-46`  
**内容**: `{ title, content }` の両方が `undefined` でも Knex は `updated_at: NOW()` だけを実行するため、実際に内容が変わっていないのにタイムスタンプが更新されて一覧の並び順が変わる。

**再現手順**:
```bash
# 変更前のupdated_atを確認
curl -s http://localhost:3001/api/notes/2 | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('updated_at:', d['updated_at'])"

# 空ボディでPUT
curl -s -X PUT http://localhost:3001/api/notes/2 \
  -H "Content-Type: application/json" -d '{}'

# 変更後を確認
curl -s http://localhost:3001/api/notes/2 | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('updated_at:', d['updated_at'])"
```

**実測値**: title/content は変わらず、updated_at だけ更新される（一覧の先頭に浮き上がる）

**修正方法**: `title` と `content` が両方 `undefined` の場合は 400 を返し、更新対象フィールドが存在するときのみ実行する。
```js
// backend/src/routes/notes.js:34
const { title, content } = req.body;
if (title === undefined && content === undefined) {
  return res.status(400).json({ error: '更新するフィールドがありません' });
}
const updates = {};
if (title !== undefined) updates.title = title;
if (content !== undefined) updates.content = content;
updates.updated_at = db.fn.now();
```

---

### BUG-08: エラーバナーが一度表示されると消えない
**場所**: `frontend/src/hooks/useNotes.js:8`, `frontend/src/App.jsx:22-24`  
**内容**: `error` state は一度セットされると `null` にリセットされる処理がない。APIエラー後に操作が成功しても古いエラーメッセージが表示され続ける。閉じるボタンも存在しない。

**再現手順**:
1. バックエンドサーバーを停止する: `kill $(lsof -ti:3001)`
2. ブラウザで `http://localhost:5173` を開く（または既に開いている場合はリロード）
3. 画面上部に赤いエラーバナーが表示されることを確認する
4. バックエンドサーバーを再起動する: `cd backend && node src/index.js`
5. アプリを操作してノートを選択したり新規作成したりする（API呼び出しが成功する）
6. エラーバナーが消えずに残り続けることを確認する（消すボタンもない）

**修正方法**: 各操作の成功時に `setError(null)` を呼ぶ、またはエラーバナーに閉じるボタンを追加する。
```jsx
// frontend/src/App.jsx
{error && (
  <div className="error-banner">
    {error}
    <button onClick={() => setError(null)}>✕</button>
  </div>
)}
```
加えて `useNotes.js` の各 `try` ブロック先頭で `setError(null)` を呼べば、次の操作成功時に自動で消える。

---

### BUG-09: `loadNotes` が stale closure で `selectedId` を常に `null` として参照する
**場所**: `frontend/src/hooks/useNotes.js:11-24`  
**内容**: `useCallback` の依存配列が `[]`（空）のため、コールバック内で参照する `selectedId` は常に初期値の `null` になる。現在は初回マウント時にしか `loadNotes` を呼んでいないため実害はないが、将来的に再取得処理を追加した場合、すでに別のノートを選択していても必ず最初のノートに選択が戻る。

**再現手順**（将来の再取得ボタン追加後に顕在化する手順）:
1. `App.jsx` に一時的に再取得ボタンを追加する:
   ```jsx
   <button onClick={loadNotes}>再取得</button>
   ```
2. アプリを開いてノートBを選択する
3. 再取得ボタンをクリックする
4. `selectedId` が `null` として評価されるため（stale closure）、条件 `!selectedId` が常に `true` になり、選択が強制的にリストの先頭（ノートA）に戻る

**コードで確認**:
```js
// useNotes.js:16 — selectedId は常に null として評価される
if (data.length > 0 && !selectedId) {  // selectedId は stale: 常に null
  setSelectedId(data[0].id);
}
```

**修正方法**: `selectedId` を `useRef` で別途保持し、`useCallback` 内から参照する。または `setSelectedId` を関数型更新にして現在値を参照する。
```js
// useNotes.js
const selectedIdRef = useRef(null);
// setSelectedId を呼ぶ箇所で selectedIdRef.current も更新する

const loadNotes = useCallback(async () => {
  const data = await api.fetchNotes();
  setNotes(data);
  if (data.length > 0 && !selectedIdRef.current) {
    setSelectedId(data[0].id);
    selectedIdRef.current = data[0].id;
  }
}, []); // ref を使うので依存配列は空のままでよい
```

---

## 重大度: 低

### BUG-10: `formatDate` で `toLocaleDateString` に時刻オプションを渡している
**場所**: `frontend/src/components/NoteCard.jsx:4-11`  
**内容**: `toLocaleDateString` は日付フォーマット専用メソッドであり、`hour` / `minute` オプションを渡した場合の挙動は ECMA-402 仕様上は実装依存。時刻を含めてフォーマットするには `toLocaleString` を使うのが正しい。現代のブラウザ（Chrome/Firefox/Safari）では同じ結果になるが、古い環境では差が生じる可能性がある。

**再現手順**:
```js
// Node.js またはブラウザのコンソールで実行
const d = new Date('2026-05-31T08:08:40.782Z');
console.log(d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
// 現代環境: "5月31日 17:08"（時刻も含まれる）
// 古い環境: "5月31日"（時刻が無視される場合がある）
```

**修正方法**: `toLocaleDateString` を `toLocaleString` に変更する。
```js
// frontend/src/components/NoteCard.jsx:5
return d.toLocaleString('ja-JP', {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
```

---

### BUG-11: 自動保存中のインジケーターがない
**場所**: `frontend/src/hooks/useNotes.js:55-71`  
**内容**: 編集中は600ms後に自動保存されるが、UIには保存中・保存済みを示す表示がない。ユーザーは保存されたかどうかを確認できず、ブラウザを閉じるタイミングが分からない。

**再現手順**:
1. ブラウザで `http://localhost:5173` を開く
2. ノートの本文を編集する
3. 編集直後（600ms以内）にブラウザの Network タブを確認する
4. PUT リクエストがまだ飛んでいない状態でも、UI上に「保存中...」などの表示が一切ないことを確認する
5. ユーザーがこのタイミングでブラウザを閉じると変更が失われるが、UI は何も警告しない

**修正方法**: `useNotes.js` に `isSaving` state を追加し、タイマー発火中は `true` にしてエディタヘッダーに表示する。
```js
// useNotes.js
const [isSaving, setIsSaving] = useState(false);

// saveNote 内
saveTimers.current.set(id, setTimeout(async () => {
  setIsSaving(true);
  await api.updateNote(id, fields);
  setIsSaving(false);
}, 600));
```
```jsx
// NoteEditor.jsx のヘッダー部分
<span className="editor-meta">
  {isSaving ? '保存中...' : '保存済み'}
</span>
```

---

### BUG-12: ノート削除時に `notes` state の旧スナップショットを参照している
**場所**: `frontend/src/hooks/useNotes.js:42-53`  
**内容**: `removeNote` 内の `const remaining = notes.filter(...)` は `notes` を直接参照しており、`setNotes` の更新後の値ではなく関数呼び出し時点のスナップショットを使っている。削除直後に別の非同期処理が走って `notes` が更新されていた場合、次の選択ノートの判定がずれる可能性がある。

**再現手順**（タイミング依存のため安定再現は困難）:
1. ノートを3件以上用意する（ノートA, B, C）
2. ノートBを編集して自動保存タイマーを発火させる（API応答待ち状態）
3. API応答が返る直前に、ノートAの削除ボタン（✕）をクリックする
4. `removeNote` 内の `notes` スナップショットがAPI応答前の状態を参照しているため、削除後に選択されるノートが意図しないノードになる場合がある

**修正方法**: `setNotes` の関数型更新を使い、最新の state から `remaining` を計算する。
```js
// useNotes.js:44
await api.deleteNote(id);
setNotes((prev) => {
  const remaining = prev.filter((n) => n.id !== id);
  if (selectedId === id) {
    setSelectedId(remaining.length > 0 ? remaining[0].id : null);
  }
  return remaining;
});
```

---

### BUG-13: 削除確認ダイアログがない
**場所**: `frontend/src/components/NoteCard.jsx:26-35`  
**内容**: ✕ ボタンを押すと確認なしに即削除される。誤操作によるデータ消失のリスクがある。削除はAPIレベルでも取り消しができない。

**再現手順**:
1. ブラウザで `http://localhost:5173` を開く
2. 左サイドバーのノートカードにマウスをホバーして ✕ ボタンを表示させる
3. ✕ ボタンをクリックする
4. 確認ダイアログが表示されず即座にノートが削除されることを確認する
5. 削除を取り消す手段がないことを確認する（Undo なし）

**修正方法**: `window.confirm` で確認ダイアログを出すか、専用の確認モーダルを追加する。
```jsx
// frontend/src/components/NoteCard.jsx:29
onClick={(e) => {
  e.stopPropagation();
  if (window.confirm('このノートを削除しますか？')) {
    onDelete(note.id);
  }
}}
```

---

### BUG-14: 検索機能がUIに存在するが完全に無効化されている
**場所**: `frontend/src/components/Sidebar.jsx:13-19`  
**内容**: 検索inputに `disabled` が付いており「準備中」と表示されるが、UIに存在することでユーザーが操作できると誤解する。未実装機能のUIを表示したままにすることはUXとして問題がある。

**再現手順**:
1. ブラウザで `http://localhost:5173` を開く
2. 左サイドバー上部の検索ボックスをクリックする
3. 何かテキストを入力しようとする
4. 入力できず、カーソルも変わらないことを確認する（`disabled` 属性のため）
5. ユーザーには検索機能があるように見えるが、一切機能しない

**修正方法**: 未実装であれば検索UIをコンポーネントから削除する。実装するなら `notes` をキーワードでフィルタリングし、`disabled` を外してフロントエンド検索を実装する。
```jsx
// frontend/src/components/Sidebar.jsx — 削除する場合
// <div className="sidebar-search"> ... </div> をまるごと削除

// 実装する場合: Sidebar に searchQuery state を追加し
// notes.filter(n => n.title.includes(query) || n.content.includes(query)) を渡す
```
