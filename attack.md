# 攻撃手法と対策

## デモ2: 全ノートを破壊（認証なし DELETE）

```bash
for i in $(seq 1 300); do curl -s -X DELETE http://localhost:3001/api/notes/$i > /dev/null; done && echo "完了"
```

### なぜ成功するか
APIに認証が一切ないため、URLを知っている人なら誰でも DELETE リクエストを送れる。

### 対策: 認証ミドルウェアの追加

#### ① JWT認証（推奨）
ログイン時にトークンを発行し、以降のリクエストにそのトークンを添付させる。トークンのないリクエストはすべて弾く。

```js
// backend/src/middleware/auth.js（新規作成）
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '認証が必要です' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効です' });
  }
};
```

```js
// backend/src/index.js — auth ミドルウェアを全ノートAPIに挟む
const auth = require('./middleware/auth');
app.use('/api/notes', auth, notesRouter);
```

フロントエンド側はログイン後に取得したトークンを `Authorization: Bearer <token>` ヘッダーに付けて送る。トークンがなければ **401 Unauthorized** で弾かれるため、攻撃者の curl コマンドは何も実行できなくなる。

#### ② セッション認証（シンプルな代替）
`express-session` と `passport.js` を組み合わせる方法もある。JWTより実装がシンプルだが、複数サーバーに水平スケールする際にセッション共有の仕組みが別途必要になる。

---

## デモ3: DBをスパムで埋め尽くす（レート制限なし POST）

```bash
for i in $(seq 1 500); do curl -s -X POST http://localhost:3001/api/notes -H "Content-Type: application/json" -d '{"title":"spam","content":"AAAAAAAAAA"}' > /dev/null & done; wait && echo "完了"
```

### なぜ成功するか
1秒間に何百リクエスト送っても制限がない。`&` で並列実行しているため数秒でDBが埋まる。

### 対策①: レート制限の追加
同じIPから短時間に大量リクエストが来たら自動的に弾く。

```js
// backend/src/index.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1分間
  max: 30,             // 1分間に最大30リクエストまで
  message: { error: 'リクエストが多すぎます。しばらく待ってください。' },
});

app.use('/api/notes', limiter);
```

30件/分を超えると **429 Too Many Requests** が返り、スクリプトが機能しなくなる。

### 対策②: コンテンツサイズの上限を明示
Expressのデフォルトは100KBだが、明示的に小さく絞ることで大容量データの投入を防ぐ。

```js
// backend/src/index.js
app.use(express.json({ limit: '10kb' })); // 10KB超は413エラー
```

### 対策③: 1ユーザーあたりのノート件数上限
認証と組み合わせて、1人のユーザーが作れるノート数に上限を設ける。

```js
// backend/src/routes/notes.js — POST ルート内に追加
const count = await db('notes').where({ user_id: req.user.id }).count('id as c').first();
if (Number(count.c) >= 200) {
  return res.status(400).json({ error: 'ノートの上限（200件）に達しました' });
}
```

---

## 共通の根本対策まとめ

| 対策 | 防げる攻撃 | 実装難易度 |
|---|---|---|
| **JWT認証** | デモ2・デモ3 両方（未認証を全APIから締め出す） | 中 |
| **レート制限** | デモ3（大量リクエストを無力化） | 低 |
| **ボディサイズ制限** | デモ3（大容量データの投入） | 低 |
| **ノート件数上限** | デモ3（DB枯渇） | 低 |
| **HTTPS強制** | 通信の盗聴・改ざん（Renderは自動で対応済み） | 不要 |

### 実装の優先順位

1. **まず認証**（これだけでデモ2・デモ3の両方をほぼ完全に防げる）
2. **次にレート制限**（認証済みユーザーによる悪用も防ぐ）
3. **ボディサイズ・件数上限**（多重防御として念のため追加）
