exports.seed = async (knex) => {
  await knex('notes').del();

  await knex('notes').insert([
    {
      title: 'メモアプリへようこそ',
      content: 'このアプリでは、左のリストからノートを選択して閲覧・編集できます。\n\n右上の「＋」ボタンから新しいノートを作成できます。\nタイトルや本文を編集すると自動で保存されます。',
      created_at: new Date('2026-05-01T09:00:00'),
      updated_at: new Date('2026-05-01T09:00:00'),
    },
    {
      title: '買い物リスト',
      content: '- 牛乳\n- 卵\n- 食パン\n- バター\n- コーヒー豆\n- りんご',
      created_at: new Date('2026-05-10T11:30:00'),
      updated_at: new Date('2026-05-10T11:30:00'),
    },
    {
      title: 'プロジェクトアイデア',
      content: '次に作りたいもの：\n\n1. AIを使った日記アプリ\n2. 家計簿ツール\n3. 読書記録アプリ\n\nまずは日記アプリから始めてみる。',
      created_at: new Date('2026-05-15T14:00:00'),
      updated_at: new Date('2026-05-20T09:15:00'),
    },
    {
      title: '技術メモ：React Hooks',
      content: 'よく使うフック一覧：\n\nuseState  → 状態管理\nuseEffect → 副作用（APIコールなど）\nuseRef    → DOMや値の参照\nuseCallback → 関数のメモ化\n\nuseEffect の依存配列には必要な値を全部入れること。',
      created_at: new Date('2026-05-22T16:45:00'),
      updated_at: new Date('2026-05-22T16:45:00'),
    },
    {
      title: '今週のTODO',
      content: '[ ] ドキュメントを更新する\n[ ] コードレビューを返す\n[x] バグ修正（ログイン周り）\n[x] デプロイ確認\n[ ] 来週の発表資料を準備する',
      created_at: new Date('2026-05-26T08:00:00'),
      updated_at: new Date('2026-05-28T10:30:00'),
    },
  ]);
};
